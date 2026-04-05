import datetime
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, JSON, Boolean, Index
from app.database import Base


class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, default=1)
    recruitee_api_token = Column(String(512), nullable=True)
    recruitee_company_id = Column(String(256), nullable=True)
    openrouter_api_key = Column(String(512), nullable=True)
    ai_model = Column(String(256), default="openai/gpt-4o-mini")
    scoring_prompt = Column(
        Text,
        default=(
            "You are an expert recruiter. Evaluate this candidate for the given job. "
            "Score them from 0-100 based on skills match, experience relevance, and overall fit. "
            "Return a JSON object with: score (integer 0-100), summary (2-3 sentence evaluation), "
            "strengths (list of strings), weaknesses (list of strings), recommendation (string: "
            "'strong_yes', 'yes', 'maybe', 'no', 'strong_no')."
        ),
    )
    # Configurable extraction and scoring
    extraction_fields = Column(
        JSON,
        default=lambda: [
            {"key": "name", "label": "Full Name", "enabled": True},
            {"key": "email", "label": "Email", "enabled": True},
            {"key": "phone", "label": "Phone", "enabled": True},
            {"key": "resume_text", "label": "Resume / CV Text", "enabled": True},
            {"key": "cover_letter", "label": "Cover Letter", "enabled": True},
            {"key": "source", "label": "Application Source", "enabled": True},
            {"key": "tags", "label": "Tags", "enabled": True},
            {"key": "custom_fields", "label": "Custom Fields", "enabled": True},
            {"key": "photo_url", "label": "Photo", "enabled": False},
        ],
    )
    scoring_criteria = Column(
        JSON,
        default=lambda: [
            {"name": "Skills Match", "weight": 30, "description": "How well the candidate's skills match the job requirements"},
            {"name": "Experience Relevance", "weight": 25, "description": "Relevance and depth of work experience"},
            {"name": "Education Fit", "weight": 15, "description": "Educational background alignment"},
            {"name": "Culture Fit", "weight": 15, "description": "Alignment with team and company culture indicators"},
            {"name": "Communication", "weight": 15, "description": "Quality of written communication in application"},
        ],
    )
    filter_rules = Column(
        JSON,
        default=lambda: {
            "auto_reject": {"enabled": False, "min_score": 20, "action": "archive"},
            "auto_advance": {"enabled": False, "min_score": 80, "target_stage": "Interview"},
            "must_have_keywords": [],
            "nice_to_have_keywords": [],
            "exclude_keywords": [],
            "min_experience_years": None,
            "required_education": None,
            "preferred_sources": [],
        },
    )
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True)
    role = Column(String(32), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    proposed_changes = Column(JSON, nullable=True)  # structured changes proposed by AI
    changes_applied = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True)
    recruitee_id = Column(Integer, unique=True, nullable=False, index=True)
    title = Column(String(512), nullable=False)
    department = Column(String(256), nullable=True)
    location = Column(String(256), nullable=True)
    status = Column(String(64), default="open")
    description = Column(Text, nullable=True)
    requirements = Column(Text, nullable=True)
    pipeline_stages = Column(JSON, default=list)
    raw_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True)
    recruitee_id = Column(Integer, unique=True, nullable=False, index=True)
    recruitee_offer_id = Column(Integer, nullable=True, index=True)
    name = Column(String(512), nullable=False)
    email = Column(String(512), nullable=True)
    phone = Column(String(128), nullable=True)
    photo_url = Column(String(1024), nullable=True)
    source = Column(String(256), nullable=True)
    resume_text = Column(Text, nullable=True)
    cover_letter = Column(Text, nullable=True)
    tags = Column(JSON, default=list)
    custom_fields = Column(JSON, default=dict)
    current_stage = Column(String(256), nullable=True)
    job_title = Column(String(512), nullable=True)
    job_recruitee_id = Column(Integer, nullable=True, index=True)

    # AI scoring fields
    ai_score = Column(Float, nullable=True)
    ai_summary = Column(Text, nullable=True)
    ai_strengths = Column(JSON, default=list)
    ai_weaknesses = Column(JSON, default=list)
    ai_recommendation = Column(String(64), nullable=True)
    ai_scored_at = Column(DateTime, nullable=True)
    ai_model_used = Column(String(256), nullable=True)
    scoring_error = Column(Text, nullable=True)

    is_archived = Column(Boolean, default=False)
    raw_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    __table_args__ = (
        Index("ix_candidates_ai_score", "ai_score"),
        Index("ix_candidates_name", "name"),
    )
