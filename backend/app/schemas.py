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
