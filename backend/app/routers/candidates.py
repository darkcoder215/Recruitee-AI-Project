"""Candidates API routes with import, scoring, search, and pipeline management."""

import asyncio
import datetime
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, or_, and_, String
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Candidate, Job, Settings
from app.schemas import (
    CandidateResponse,
    CandidateListResponse,
    MoveStageRequest,
    BulkScoreRequest,
    ImportRequest,
    ImportResponse,
)
from app.services.recruitee import RecruiteeClient, RecruiteeAPIError
from app.services.openrouter import score_candidate, AIServiceError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/candidates", tags=["candidates"])


def _apply_filter_rules(candidate, settings):
    """Apply automated filter rules after scoring."""
    rules = settings.filter_rules
    if not rules or not isinstance(rules, dict):
        return

    score = candidate.ai_score
    if score is None:
        return

    # Auto-reject: archive candidates below threshold
    auto_reject = rules.get("auto_reject", {})
    if (
        isinstance(auto_reject, dict)
        and auto_reject.get("enabled")
        and auto_reject.get("min_score") is not None
        and score < auto_reject["min_score"]
    ):
        action = auto_reject.get("action", "archive")
        if action == "archive":
            candidate.is_archived = True
        candidate.current_stage = "Rejected"

    # Auto-advance: move high scorers to a target stage
    auto_advance = rules.get("auto_advance", {})
    if (
        isinstance(auto_advance, dict)
        and auto_advance.get("enabled")
        and auto_advance.get("min_score") is not None
        and score >= auto_advance["min_score"]
        and auto_advance.get("target_stage")
    ):
        candidate.current_stage = auto_advance["target_stage"]


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_settings(db: AsyncSession) -> Settings:
    result = await db.execute(select(Settings).where(Settings.id == 1))
    settings = result.scalar_one_or_none()
    if not settings:
        raise HTTPException(status_code=400, detail="Settings not configured. Please set up your API keys first.")
    return settings


def _extract_candidate_data(placement: dict, offer: dict | None = None) -> dict:
    """Extract normalized candidate data from a Recruitee placement."""
    candidate_data = placement.get("candidate", placement)

    name_parts = []
    if candidate_data.get("first_name"):
        name_parts.append(str(candidate_data["first_name"]).strip())
    if candidate_data.get("last_name"):
        name_parts.append(str(candidate_data["last_name"]).strip())
    name = " ".join(name_parts) if name_parts else candidate_data.get("name", "Unknown Candidate")

    emails = candidate_data.get("emails", [])
    email = None
    if isinstance(emails, list) and emails:
        email = emails[0] if isinstance(emails[0], str) else emails[0].get("address")
    elif isinstance(candidate_data.get("email"), str):
        email = candidate_data["email"]

    phones = candidate_data.get("phones", [])
    phone = None
    if isinstance(phones, list) and phones:
        phone = phones[0] if isinstance(phones[0], str) else phones[0].get("number")
    elif isinstance(candidate_data.get("phone"), str):
        phone = candidate_data["phone"]

    photo = candidate_data.get("photo_thumb_url") or candidate_data.get("photo_url")

    tags = candidate_data.get("tags", [])
    if not isinstance(tags, list):
        tags = []

    # Try to get resume/cover letter text
    resume_text = ""
    cover_letter = ""
    qualifications = candidate_data.get("qualifications", [])
    if isinstance(qualifications, list):
        for q in qualifications:
            if isinstance(q, dict):
                body = q.get("body", "")
                if q.get("kind") == "cover_letter":
                    cover_letter += body + "\n"
                else:
                    resume_text += body + "\n"

    # Also check description fields
    if candidate_data.get("description"):
        resume_text += "\n" + str(candidate_data["description"])

    # Stage info
    stage_name = None
    if placement.get("stage"):
        stage_name = placement["stage"] if isinstance(placement["stage"], str) else placement.get("stage", {}).get("name")
    elif placement.get("current_stage_name"):
        stage_name = placement["current_stage_name"]

    return {
        "recruitee_id": candidate_data.get("id", placement.get("candidate_id", 0)),
        "recruitee_offer_id": placement.get("offer_id"),
        "name": name,
        "email": email,
        "phone": phone,
        "photo_url": photo,
        "source": candidate_data.get("source"),
        "resume_text": resume_text.strip() or None,
        "cover_letter": cover_letter.strip() or None,
        "tags": tags,
        "custom_fields": candidate_data.get("custom_fields", {}),
        "current_stage": stage_name,
        "job_title": offer.get("title") if offer else None,
        "job_recruitee_id": placement.get("offer_id"),
    }


# ── Import ────────────────────────────────────────────────────────────────────

@router.post("/import", response_model=ImportResponse)
async def import_candidates(payload: ImportRequest, db: AsyncSession = Depends(get_db)):
    """Import candidates from a specific Recruitee job offer."""
    settings = await _get_settings(db)

    if not settings.recruitee_api_token or not settings.recruitee_company_id:
        raise HTTPException(status_code=400, detail="Recruitee credentials not configured.")

    try:
        client = RecruiteeClient(settings.recruitee_company_id, settings.recruitee_api_token)
    except RecruiteeAPIError as e:
        raise HTTPException(status_code=400, detail=str(e.message))

    errors = []
    jobs_imported = 0
    candidates_imported = 0

    # Fetch the offer
    try:
        offer = await client.get_offer(payload.job_recruitee_id)
    except RecruiteeAPIError as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch job: {e.message}")

    if not offer:
        raise HTTPException(status_code=404, detail="Job offer not found in Recruitee.")

    # Upsert the job
    try:
        result = await db.execute(
            select(Job).where(Job.recruitee_id == payload.job_recruitee_id)
        )
        job = result.scalar_one_or_none()

        pipeline = offer.get("offer_stages", offer.get("admin_stages", []))
        stages = []
        if isinstance(pipeline, list):
            for s in pipeline:
                if isinstance(s, dict):
                    stages.append({"id": s.get("id"), "name": s.get("name", "Unknown")})

        if not job:
            job = Job(
                recruitee_id=payload.job_recruitee_id,
                title=offer.get("title", "Untitled"),
                department=offer.get("department"),
                location=offer.get("location"),
                status=offer.get("status", "open"),
                description=offer.get("description", ""),
                requirements=offer.get("requirements", ""),
                pipeline_stages=stages,
                raw_data=offer,
            )
            db.add(job)
        else:
            job.title = offer.get("title", job.title)
            job.pipeline_stages = stages
            job.raw_data = offer

        jobs_imported = 1
    except Exception as e:
        errors.append(f"Error saving job: {str(e)}")

    # Fetch placements (candidates)
    try:
        placements = await client.list_candidates_for_offer(payload.job_recruitee_id)
    except RecruiteeAPIError as e:
        await db.commit()
        raise HTTPException(
            status_code=502,
            detail=f"Job imported but failed to fetch candidates: {e.message}",
        )

    if not placements:
        await db.commit()
        return ImportResponse(jobs_imported=jobs_imported, candidates_imported=0, errors=errors + ["No candidates found for this job."])

    for placement in placements:
        try:
            data = _extract_candidate_data(placement, offer)
            if not data["recruitee_id"]:
                errors.append("Placement missing candidate ID, skipped.")
                continue

            result = await db.execute(
                select(Candidate).where(
                    and_(
                        Candidate.recruitee_id == data["recruitee_id"],
                        Candidate.recruitee_offer_id == data["recruitee_offer_id"],
                    )
                )
            )
            existing = result.scalar_one_or_none()

            if existing:
                for key, value in data.items():
                    setattr(existing, key, value)
                existing.raw_data = placement
            else:
                candidate = Candidate(**data, raw_data=placement)
                db.add(candidate)
            candidates_imported += 1
        except Exception as e:
            cid = placement.get("candidate_id", placement.get("id", "?"))
            errors.append(f"Error importing candidate {cid}: {str(e)}")
            logger.exception(f"Error importing candidate {cid}")

    await db.commit()
    return ImportResponse(
        jobs_imported=jobs_imported,
        candidates_imported=candidates_imported,
        errors=errors,
    )


# ── List & Advanced Search ────────────────────────────────────────────────────

@router.get("", response_model=CandidateListResponse)
async def list_candidates(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    # Basic search
    search: str | None = Query(None, max_length=256),
    # Field-specific search
    name_contains: str | None = Query(None, max_length=256),
    email_contains: str | None = Query(None, max_length=256),
    resume_contains: str | None = Query(None, max_length=512),
    # Keyword search (comma-separated)
    keywords: str | None = Query(None, max_length=1024, description="Comma-separated keywords to search in name, resume, cover letter, summary"),
    keywords_mode: str = Query("any", pattern="^(any|all)$"),
    exclude_keywords: str | None = Query(None, max_length=1024, description="Comma-separated keywords to exclude"),
    # Structured filters
    job_id: int | None = Query(None, description="Filter by job recruitee ID"),
    min_score: float | None = Query(None, ge=0, le=100),
    max_score: float | None = Query(None, ge=0, le=100),
    recommendation: str | None = Query(None),
    recommendations: str | None = Query(None, description="Comma-separated recommendations"),
    stage: str | None = Query(None),
    stages: str | None = Query(None, description="Comma-separated stages"),
    source: str | None = Query(None),
    sources: str | None = Query(None, description="Comma-separated sources"),
    tags: str | None = Query(None, description="Comma-separated tags"),
    tags_mode: str = Query("any", pattern="^(any|all)$"),
    scored_only: bool = Query(False),
    has_resume: bool | None = Query(None),
    has_cover_letter: bool | None = Query(None),
    # Date filters
    scored_after: str | None = Query(None),
    scored_before: str | None = Query(None),
    created_after: str | None = Query(None),
    created_before: str | None = Query(None),
    # Sort & pagination
    sort_by: str = Query("created_at", pattern="^(created_at|ai_score|name|updated_at|ai_scored_at)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    is_archived: bool = Query(False),
    # Facets
    include_facets: bool = Query(False, description="Include facet counts for filters"),
    db: AsyncSession = Depends(get_db),
):
    """Advanced candidate search with full-text, field-specific, keyword, and structured filters."""
    query = select(Candidate).where(Candidate.is_archived == is_archived)
    count_query = select(func.count(Candidate.id)).where(Candidate.is_archived == is_archived)

    filters = []

    # Global text search — matches across multiple fields
    if search:
        term = f"%{search}%"
        filters.append(
            or_(
                Candidate.name.ilike(term),
                Candidate.email.ilike(term),
                Candidate.job_title.ilike(term),
                Candidate.ai_summary.ilike(term),
                Candidate.current_stage.ilike(term),
                Candidate.resume_text.ilike(term),
                Candidate.cover_letter.ilike(term),
                Candidate.source.ilike(term),
            )
        )

    # Field-specific text search
    if name_contains:
        filters.append(Candidate.name.ilike(f"%{name_contains}%"))
    if email_contains:
        filters.append(Candidate.email.ilike(f"%{email_contains}%"))
    if resume_contains:
        filters.append(
            or_(
                Candidate.resume_text.ilike(f"%{resume_contains}%"),
                Candidate.cover_letter.ilike(f"%{resume_contains}%"),
            )
        )

    # Keyword search: match across text fields
    if keywords:
        kw_list = [k.strip() for k in keywords.split(",") if k.strip()]
        if kw_list:
            kw_filters = []
            for kw in kw_list:
                term = f"%{kw}%"
                kw_filters.append(
                    or_(
                        Candidate.name.ilike(term),
                        Candidate.resume_text.ilike(term),
                        Candidate.cover_letter.ilike(term),
                        Candidate.ai_summary.ilike(term),
                        Candidate.job_title.ilike(term),
                    )
                )
            if keywords_mode == "all":
                filters.append(and_(*kw_filters))
            else:
                filters.append(or_(*kw_filters))

    # Exclude keywords: reject if any appear
    if exclude_keywords:
        exc_list = [k.strip() for k in exclude_keywords.split(",") if k.strip()]
        for kw in exc_list:
            term = f"%{kw}%"
            filters.append(
                ~or_(
                    Candidate.name.ilike(term),
                    Candidate.resume_text.ilike(term),
                    Candidate.cover_letter.ilike(term),
                    Candidate.ai_summary.ilike(term),
                )
            )

    # Structured filters
    if job_id is not None:
        filters.append(Candidate.job_recruitee_id == job_id)

    if min_score is not None:
        filters.append(Candidate.ai_score >= min_score)
    if max_score is not None:
        filters.append(Candidate.ai_score <= max_score)

    if recommendation:
        filters.append(Candidate.ai_recommendation == recommendation)
    elif recommendations:
        rec_list = [r.strip() for r in recommendations.split(",") if r.strip()]
        if rec_list:
            filters.append(Candidate.ai_recommendation.in_(rec_list))

    if stage:
        filters.append(Candidate.current_stage == stage)
    elif stages:
        stage_list = [s.strip() for s in stages.split(",") if s.strip()]
        if stage_list:
            filters.append(Candidate.current_stage.in_(stage_list))

    if source:
        filters.append(Candidate.source == source)
    elif sources:
        src_list = [s.strip() for s in sources.split(",") if s.strip()]
        if src_list:
            filters.append(Candidate.source.in_(src_list))

    # Tag filtering (JSON column — uses LIKE on serialized JSON)
    if tags:
        tag_list = [t.strip() for t in tags.split(",") if t.strip()]
        if tag_list:
            tag_filters = []
            for tag in tag_list:
                tag_filters.append(Candidate.tags.cast(String).ilike(f'%"{tag}"%'))
            if tags_mode == "all":
                filters.append(and_(*tag_filters))
            else:
                filters.append(or_(*tag_filters))

    if scored_only:
        filters.append(Candidate.ai_score.isnot(None))

    if has_resume is True:
        filters.append(Candidate.resume_text.isnot(None))
        filters.append(Candidate.resume_text != "")
    elif has_resume is False:
        filters.append(or_(Candidate.resume_text.is_(None), Candidate.resume_text == ""))

    if has_cover_letter is True:
        filters.append(Candidate.cover_letter.isnot(None))
        filters.append(Candidate.cover_letter != "")
    elif has_cover_letter is False:
        filters.append(or_(Candidate.cover_letter.is_(None), Candidate.cover_letter == ""))

    # Date filters
    if scored_after:
        try:
            filters.append(Candidate.ai_scored_at >= scored_after)
        except Exception:
            pass
    if scored_before:
        try:
            filters.append(Candidate.ai_scored_at <= scored_before)
        except Exception:
            pass
    if created_after:
        try:
            filters.append(Candidate.created_at >= created_after)
        except Exception:
            pass
    if created_before:
        try:
            filters.append(Candidate.created_at <= created_before)
        except Exception:
            pass

    if filters:
        combined = and_(*filters)
        query = query.where(combined)
        count_query = count_query.where(combined)

    # Count
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Facets — count breakdowns for key dimensions
    facets = None
    if include_facets:
        facets = await _compute_facets(db, is_archived)

    # Sort
    sort_column = getattr(Candidate, sort_by, Candidate.created_at)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc().nullslast())
    else:
        query = query.order_by(sort_column.asc().nullsfirst())

    # Paginate
    offset_val = (page - 1) * page_size
    query = query.offset(offset_val).limit(page_size)

    result = await db.execute(query)
    candidates = result.scalars().all()

    return CandidateListResponse(
        candidates=[CandidateResponse.model_validate(c) for c in candidates],
        total=total,
        page=page,
        page_size=page_size,
        facets=facets,
    )


async def _compute_facets(db: AsyncSession, is_archived: bool) -> dict:
    """Compute filter facet counts for the sidebar."""
    base = Candidate.is_archived == is_archived

    # Recommendations
    rec_counts = {}
    for rec in ["strong_yes", "yes", "maybe", "no", "strong_no"]:
        r = await db.execute(
            select(func.count(Candidate.id)).where(and_(base, Candidate.ai_recommendation == rec))
        )
        count = r.scalar() or 0
        if count > 0:
            rec_counts[rec] = count

    # Stages
    stage_result = await db.execute(
        select(Candidate.current_stage, func.count(Candidate.id))
        .where(and_(base, Candidate.current_stage.isnot(None)))
        .group_by(Candidate.current_stage)
        .order_by(func.count(Candidate.id).desc())
        .limit(20)
    )
    stage_counts = {row[0]: row[1] for row in stage_result.all()}

    # Sources
    source_result = await db.execute(
        select(Candidate.source, func.count(Candidate.id))
        .where(and_(base, Candidate.source.isnot(None)))
        .group_by(Candidate.source)
        .order_by(func.count(Candidate.id).desc())
        .limit(20)
    )
    source_counts = {row[0]: row[1] for row in source_result.all()}

    # Jobs
    job_result = await db.execute(
        select(Candidate.job_title, Candidate.job_recruitee_id, func.count(Candidate.id))
        .where(and_(base, Candidate.job_title.isnot(None)))
        .group_by(Candidate.job_title, Candidate.job_recruitee_id)
        .order_by(func.count(Candidate.id).desc())
        .limit(20)
    )
    job_counts = [
        {"title": row[0], "job_id": row[1], "count": row[2]}
        for row in job_result.all()
    ]

    # Score distribution
    score_ranges = {}
    for label, lo, hi in [("0-20", 0, 20), ("21-40", 21, 40), ("41-60", 41, 60), ("61-80", 61, 80), ("81-100", 81, 100)]:
        r = await db.execute(
            select(func.count(Candidate.id)).where(
                and_(base, Candidate.ai_score >= lo, Candidate.ai_score <= hi)
            )
        )
        count = r.scalar() or 0
        if count > 0:
            score_ranges[label] = count

    # Content availability
    has_resume_r = await db.execute(
        select(func.count(Candidate.id)).where(
            and_(base, Candidate.resume_text.isnot(None), Candidate.resume_text != "")
        )
    )
    has_cl_r = await db.execute(
        select(func.count(Candidate.id)).where(
            and_(base, Candidate.cover_letter.isnot(None), Candidate.cover_letter != "")
        )
    )
    scored_r = await db.execute(
        select(func.count(Candidate.id)).where(and_(base, Candidate.ai_score.isnot(None)))
    )

    return {
        "recommendations": rec_counts,
        "stages": stage_counts,
        "sources": source_counts,
        "jobs": job_counts,
        "score_ranges": score_ranges,
        "has_resume": has_resume_r.scalar() or 0,
        "has_cover_letter": has_cl_r.scalar() or 0,
        "scored": scored_r.scalar() or 0,
    }


# ── Single Candidate ─────────────────────────────────────────────────────────

@router.get("/{candidate_id}", response_model=CandidateResponse)
async def get_candidate(candidate_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single candidate by ID."""
    result = await db.execute(select(Candidate).where(Candidate.id == candidate_id))
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found.")
    return candidate


# ── AI Scoring ────────────────────────────────────────────────────────────────

@router.post("/{candidate_id}/score", response_model=CandidateResponse)
async def score_single_candidate(candidate_id: int, db: AsyncSession = Depends(get_db)):
    """Score a single candidate with AI."""
    settings = await _get_settings(db)
    if not settings.openrouter_api_key:
        raise HTTPException(status_code=400, detail="OpenRouter API key not configured.")

    result = await db.execute(select(Candidate).where(Candidate.id == candidate_id))
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    # Get associated job if available
    job_data = None
    if candidate.job_recruitee_id:
        job_result = await db.execute(
            select(Job).where(Job.recruitee_id == candidate.job_recruitee_id)
        )
        job = job_result.scalar_one_or_none()
        if job:
            job_data = {
                "title": job.title,
                "department": job.department,
                "description": job.description,
                "requirements": job.requirements,
            }

    candidate_data = {
        "name": candidate.name,
        "resume_text": candidate.resume_text,
        "cover_letter": candidate.cover_letter,
        "tags": candidate.tags or [],
        "source": candidate.source,
        "custom_fields": candidate.custom_fields or {},
    }

    try:
        ai_result = await score_candidate(
            api_key=settings.openrouter_api_key,
            model=settings.ai_model or "openai/gpt-4o-mini",
            candidate=candidate_data,
            job=job_data,
            scoring_prompt=settings.scoring_prompt or "",
            scoring_criteria=settings.scoring_criteria,
            extraction_fields=settings.extraction_fields,
        )

        candidate.ai_score = ai_result["score"]
        candidate.ai_summary = ai_result["summary"]
        candidate.ai_strengths = ai_result["strengths"]
        candidate.ai_weaknesses = ai_result["weaknesses"]
        candidate.ai_recommendation = ai_result["recommendation"]
        candidate.ai_scored_at = datetime.datetime.utcnow()
        candidate.ai_model_used = settings.ai_model
        candidate.scoring_error = None

        # Apply filter rules after scoring
        _apply_filter_rules(candidate, settings)

    except AIServiceError as e:
        candidate.scoring_error = str(e.message)
        await db.commit()
        raise HTTPException(status_code=502, detail=str(e.message))

    await db.commit()
    await db.refresh(candidate)
    return candidate


@router.post("/bulk-score")
async def bulk_score_candidates(payload: BulkScoreRequest, db: AsyncSession = Depends(get_db)):
    """Score multiple candidates with AI (processes sequentially to respect rate limits)."""
    settings = await _get_settings(db)
    if not settings.openrouter_api_key:
        raise HTTPException(status_code=400, detail="OpenRouter API key not configured.")

    results = {"scored": 0, "failed": 0, "errors": []}

    for cid in payload.candidate_ids:
        try:
            result = await db.execute(select(Candidate).where(Candidate.id == cid))
            candidate = result.scalar_one_or_none()
            if not candidate:
                results["errors"].append(f"Candidate {cid} not found.")
                results["failed"] += 1
                continue

            job_data = None
            if candidate.job_recruitee_id:
                job_result = await db.execute(
                    select(Job).where(Job.recruitee_id == candidate.job_recruitee_id)
                )
                job = job_result.scalar_one_or_none()
                if job:
                    job_data = {
                        "title": job.title,
                        "department": job.department,
                        "description": job.description,
                        "requirements": job.requirements,
                    }

            candidate_data = {
                "name": candidate.name,
                "resume_text": candidate.resume_text,
                "cover_letter": candidate.cover_letter,
                "tags": candidate.tags or [],
                "source": candidate.source,
                "custom_fields": candidate.custom_fields or {},
            }

            ai_result = await score_candidate(
                api_key=settings.openrouter_api_key,
                model=settings.ai_model or "openai/gpt-4o-mini",
                candidate=candidate_data,
                job=job_data,
                scoring_prompt=settings.scoring_prompt or "",
                scoring_criteria=settings.scoring_criteria,
                extraction_fields=settings.extraction_fields,
            )

            candidate.ai_score = ai_result["score"]
            candidate.ai_summary = ai_result["summary"]
            candidate.ai_strengths = ai_result["strengths"]
            candidate.ai_weaknesses = ai_result["weaknesses"]
            candidate.ai_recommendation = ai_result["recommendation"]
            candidate.ai_scored_at = datetime.datetime.utcnow()
            candidate.ai_model_used = settings.ai_model
            candidate.scoring_error = None

            _apply_filter_rules(candidate, settings)
            results["scored"] += 1

            # Rate limiting pause between candidates
            await asyncio.sleep(1)

        except AIServiceError as e:
            results["errors"].append(f"Candidate {cid}: {e.message}")
            results["failed"] += 1
            # Save the error on the candidate
            if candidate:
                candidate.scoring_error = str(e.message)
        except Exception as e:
            results["errors"].append(f"Candidate {cid}: Unexpected error - {str(e)}")
            results["failed"] += 1

    await db.commit()
    return results


# ── Pipeline Management ───────────────────────────────────────────────────────

@router.put("/{candidate_id}/stage", response_model=CandidateResponse)
async def move_candidate_stage(
    candidate_id: int, payload: MoveStageRequest, db: AsyncSession = Depends(get_db)
):
    """Move a candidate to a different pipeline stage (local + Recruitee sync)."""
    settings = await _get_settings(db)

    result = await db.execute(select(Candidate).where(Candidate.id == candidate_id))
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    old_stage = candidate.current_stage
    candidate.current_stage = payload.stage

    # Try to sync with Recruitee if credentials are available
    sync_error = None
    if (
        settings.recruitee_api_token
        and settings.recruitee_company_id
        and candidate.recruitee_offer_id
        and candidate.raw_data
    ):
        try:
            client = RecruiteeClient(settings.recruitee_company_id, settings.recruitee_api_token)

            # Find the stage ID from the job's pipeline
            job_result = await db.execute(
                select(Job).where(Job.recruitee_id == candidate.recruitee_offer_id)
            )
            job = job_result.scalar_one_or_none()

            stage_id = None
            if job and job.pipeline_stages:
                for s in job.pipeline_stages:
                    if isinstance(s, dict) and s.get("name") == payload.stage:
                        stage_id = s.get("id")
                        break

            if stage_id:
                placement_id = candidate.raw_data.get("id") if isinstance(candidate.raw_data, dict) else None
                if placement_id:
                    await client.move_candidate_stage(
                        offer_id=candidate.recruitee_offer_id,
                        placement_id=placement_id,
                        stage_id=stage_id,
                    )
                else:
                    sync_error = "Could not determine placement ID for Recruitee sync."
            else:
                sync_error = f"Stage '{payload.stage}' not found in Recruitee pipeline. Updated locally only."
        except RecruiteeAPIError as e:
            sync_error = f"Recruitee sync failed: {e.message}. Updated locally."
        except Exception as e:
            sync_error = f"Recruitee sync error: {str(e)}. Updated locally."

    await db.commit()
    await db.refresh(candidate)

    response = CandidateResponse.model_validate(candidate)
    if sync_error:
        # Return candidate with a warning header
        logger.warning(f"Stage move sync issue for candidate {candidate_id}: {sync_error}")

    return response


# ── Archive ───────────────────────────────────────────────────────────────────

@router.put("/{candidate_id}/archive")
async def archive_candidate(candidate_id: int, db: AsyncSession = Depends(get_db)):
    """Archive a candidate."""
    result = await db.execute(select(Candidate).where(Candidate.id == candidate_id))
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found.")
    candidate.is_archived = True
    await db.commit()
    return {"success": True, "message": f"Candidate '{candidate.name}' archived."}


@router.put("/{candidate_id}/unarchive")
async def unarchive_candidate(candidate_id: int, db: AsyncSession = Depends(get_db)):
    """Unarchive a candidate."""
    result = await db.execute(select(Candidate).where(Candidate.id == candidate_id))
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found.")
    candidate.is_archived = False
    await db.commit()
    return {"success": True, "message": f"Candidate '{candidate.name}' unarchived."}


# ── Stats ─────────────────────────────────────────────────────────────────────

@router.get("/stats/overview")
async def candidate_stats(db: AsyncSession = Depends(get_db)):
    """Get candidate statistics."""
    total = await db.execute(select(func.count(Candidate.id)).where(Candidate.is_archived == False))
    scored = await db.execute(
        select(func.count(Candidate.id)).where(
            and_(Candidate.ai_score.isnot(None), Candidate.is_archived == False)
        )
    )
    avg_score = await db.execute(
        select(func.avg(Candidate.ai_score)).where(
            and_(Candidate.ai_score.isnot(None), Candidate.is_archived == False)
        )
    )

    # Recommendation breakdown
    rec_counts = {}
    for rec in ["strong_yes", "yes", "maybe", "no", "strong_no"]:
        count = await db.execute(
            select(func.count(Candidate.id)).where(
                and_(Candidate.ai_recommendation == rec, Candidate.is_archived == False)
            )
        )
        rec_counts[rec] = count.scalar() or 0

    return {
        "total_candidates": total.scalar() or 0,
        "scored_candidates": scored.scalar() or 0,
        "average_score": round(avg_score.scalar() or 0, 1),
        "recommendations": rec_counts,
    }
