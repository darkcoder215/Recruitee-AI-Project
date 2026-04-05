from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime


# ── Settings ──────────────────────────────────────────────────────────────────

class SettingsUpdate(BaseModel):
    recruitee_api_token: Optional[str] = None
    recruitee_company_id: Optional[str] = None
    openrouter_api_key: Optional[str] = None
    ai_model: Optional[str] = None
    scoring_prompt: Optional[str] = None
    extraction_fields: Optional[list] = None
    scoring_criteria: Optional[list] = None
    filter_rules: Optional[dict] = None

    @field_validator("recruitee_api_token", "openrouter_api_key", mode="before")
    @classmethod
    def strip_whitespace(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if v == "":
                return None
        return v


class SettingsResponse(BaseModel):
    recruitee_api_token_set: bool
    recruitee_company_id: Optional[str] = None
    openrouter_api_key_set: bool
    ai_model: str
    scoring_prompt: str
    extraction_fields: list = []
    scoring_criteria: list = []
    filter_rules: dict = {}
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Jobs ──────────────────────────────────────────────────────────────────────

class JobResponse(BaseModel):
    id: int
    recruitee_id: int
    title: str
    department: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    pipeline_stages: list = []
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Candidates ────────────────────────────────────────────────────────────────

class CandidateResponse(BaseModel):
    id: int
    recruitee_id: int
    recruitee_offer_id: Optional[int] = None
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    photo_url: Optional[str] = None
    source: Optional[str] = None
    tags: list = []
    current_stage: Optional[str] = None
    job_title: Optional[str] = None
    job_recruitee_id: Optional[int] = None

    ai_score: Optional[float] = None
    ai_summary: Optional[str] = None
    ai_strengths: list = []
    ai_weaknesses: list = []
    ai_recommendation: Optional[str] = None
    ai_scored_at: Optional[datetime] = None
    ai_model_used: Optional[str] = None
    scoring_error: Optional[str] = None

    is_archived: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class CandidateListResponse(BaseModel):
    candidates: list[CandidateResponse]
    total: int
    page: int
    page_size: int
    facets: Optional[dict] = None


class MoveStageRequest(BaseModel):
    stage: str = Field(..., min_length=1, max_length=256)


class BulkScoreRequest(BaseModel):
    candidate_ids: list[int] = Field(..., min_length=1, max_length=100)


class ImportRequest(BaseModel):
    job_recruitee_id: int


class ImportResponse(BaseModel):
    jobs_imported: int
    candidates_imported: int
    errors: list[str]


# ── Chat / AI Assistant ──────────────────────────────────────────────────────

class ChatMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)


class ProposedChange(BaseModel):
    section: str  # scoring_prompt, scoring_criteria, filter_rules, extraction_fields
    description: str
    current_value: Optional[object] = None
    new_value: object


class ChatMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    proposed_changes: Optional[list[ProposedChange]] = None
    changes_applied: bool = False
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ApplyChangesRequest(BaseModel):
    message_id: int


class ChatHistoryResponse(BaseModel):
    messages: list[ChatMessageResponse]


# ── Saved Searches ───────────────────────────────────────────────────────────

class SavedSearchFilters(BaseModel):
    search: Optional[str] = None
    job_id: Optional[int] = None
    min_score: Optional[float] = Field(None, ge=0, le=100)
    max_score: Optional[float] = Field(None, ge=0, le=100)
    recommendation: Optional[str] = None
    recommendations: Optional[list[str]] = None
    stage: Optional[str] = None
    stages: Optional[list[str]] = None
    scored_only: bool = False
    has_resume: Optional[bool] = None
    has_cover_letter: Optional[bool] = None
    source: Optional[str] = None
    sources: Optional[list[str]] = None
    tags: Optional[list[str]] = None
    tags_mode: Optional[str] = "any"  # "any" or "all"
    name_contains: Optional[str] = None
    email_contains: Optional[str] = None
    resume_contains: Optional[str] = None
    keywords: Optional[list[str]] = None
    keywords_mode: Optional[str] = "any"  # "any" or "all" — matches across name, resume, cover letter, summary
    exclude_keywords: Optional[list[str]] = None
    scored_after: Optional[datetime] = None
    scored_before: Optional[datetime] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    is_archived: bool = False
    sort_by: str = "created_at"
    sort_order: str = "desc"


class SavedSearchCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=256)
    description: Optional[str] = Field(None, max_length=512)
    filters: SavedSearchFilters
    is_default: bool = False


class SavedSearchUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=256)
    description: Optional[str] = Field(None, max_length=512)
    filters: Optional[SavedSearchFilters] = None
    is_default: Optional[bool] = None


class SavedSearchResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    filters: dict
    is_default: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
