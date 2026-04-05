"""Jobs API routes."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Job, Settings
from app.schemas import JobResponse
from app.services.recruitee import RecruiteeClient, RecruiteeAPIError

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.get("", response_model=list[JobResponse])
async def list_jobs(
    status: str | None = Query(None, description="Filter by status"),
    db: AsyncSession = Depends(get_db),
):
    """List all imported jobs."""
    query = select(Job)
    if status:
        query = query.where(Job.status == status)
    query = query.order_by(Job.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/sync")
async def sync_jobs(db: AsyncSession = Depends(get_db)):
    """Sync jobs from Recruitee API."""
    result = await db.execute(select(Settings).where(Settings.id == 1))
    settings = result.scalar_one_or_none()
    if not settings or not settings.recruitee_api_token or not settings.recruitee_company_id:
        raise HTTPException(status_code=400, detail="Recruitee API credentials not configured.")

    try:
        client = RecruiteeClient(settings.recruitee_company_id, settings.recruitee_api_token)
        offers = await client.list_offers()
    except RecruiteeAPIError as e:
        raise HTTPException(status_code=502, detail=str(e.message))

    imported = 0
    errors = []

    for offer in offers:
        try:
            recruitee_id = offer.get("id")
            if not recruitee_id:
                errors.append("Offer missing ID, skipped.")
                continue

            existing = await db.execute(
                select(Job).where(Job.recruitee_id == recruitee_id)
            )
            job = existing.scalar_one_or_none()

            title = offer.get("title", "Untitled Position")
            department = offer.get("department", None)
            location = offer.get("location", None)
            status = offer.get("status", "open")
            description = offer.get("description", "")
            requirements = offer.get("requirements", "")

            # Extract pipeline stages
            pipeline = offer.get("offer_stages", offer.get("admin_stages", []))
            stages = []
            if isinstance(pipeline, list):
                for s in pipeline:
                    if isinstance(s, dict):
                        stages.append({
                            "id": s.get("id"),
                            "name": s.get("name", "Unknown"),
                        })

            if job:
                job.title = title
                job.department = department
                job.location = location
                job.status = status
                job.description = description
                job.requirements = requirements
                job.pipeline_stages = stages
                job.raw_data = offer
            else:
                job = Job(
                    recruitee_id=recruitee_id,
                    title=title,
                    department=department,
                    location=location,
                    status=status,
                    description=description,
                    requirements=requirements,
                    pipeline_stages=stages,
                    raw_data=offer,
                )
                db.add(job)
            imported += 1
        except Exception as e:
            errors.append(f"Error importing offer {offer.get('id', '?')}: {str(e)}")

    await db.commit()
    return {"imported": imported, "total_from_api": len(offers), "errors": errors}


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single job."""
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job
