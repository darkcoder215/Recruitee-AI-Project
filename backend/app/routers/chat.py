"""AI Chat Assistant for configuring filtering, extraction, and scoring."""

import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Settings, ChatMessage
from app.schemas import (
    ChatMessageRequest,
    ChatMessageResponse,
    ApplyChangesRequest,
    ChatHistoryResponse,
)
from app.services.openrouter import AIServiceError

import httpx

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

SYSTEM_PROMPT = """You are an AI configuration assistant for a recruitment screening platform.
The platform imports candidates from Recruitee and scores them with AI.

You help the user configure:
1. **Scoring Criteria** — weighted dimensions used to evaluate candidates (each has name, weight 0-100, description). Weights should sum to 100.
2. **Scoring Prompt** — the system prompt sent to the AI model when scoring candidates.
3. **Filter Rules** — automation rules: auto-reject (min score + archive), auto-advance (min score + target stage), must-have keywords, nice-to-have keywords, exclude keywords, min experience years, required education, preferred sources.
4. **Extraction Fields** — which fields to extract from candidate profiles (each has key, label, enabled boolean).

CURRENT CONFIGURATION:
{current_config}

When the user describes what they want, you MUST respond with EXACTLY this JSON structure (no markdown fences, just raw JSON):
{{
  "message": "A friendly explanation of what you understood and what changes you propose",
  "proposed_changes": [
    {{
      "section": "<one of: scoring_prompt, scoring_criteria, filter_rules, extraction_fields>",
      "description": "Human-readable description of this change",
      "new_value": <the complete new value for this section>
    }}
  ]
}}

Rules:
- Always return the COMPLETE new value for a section, not a partial diff.
- For scoring_criteria, ensure weights sum to 100. Each item: {{"name": str, "weight": int, "description": str}}.
- For filter_rules, use this structure: {{"auto_reject": {{"enabled": bool, "min_score": int, "action": "archive"}}, "auto_advance": {{"enabled": bool, "min_score": int, "target_stage": str}}, "must_have_keywords": [str], "nice_to_have_keywords": [str], "exclude_keywords": [str], "min_experience_years": int|null, "required_education": str|null, "preferred_sources": [str]}}.
- For extraction_fields, each item: {{"key": str, "label": str, "enabled": bool}}.
- For scoring_prompt, provide the complete new prompt text as a string.
- If the user asks a question or you need clarification, set proposed_changes to an empty array [].
- Keep the message conversational and clear.
- If the user's request is ambiguous, ask for clarification.
- RESPOND ONLY WITH JSON. No markdown, no extra text."""


async def _get_settings(db: AsyncSession) -> Settings:
    from app.routers.settings import _get_or_create_settings
    return await _get_or_create_settings(db)


def _build_current_config(settings: Settings) -> str:
    """Build a string representation of current config for the prompt."""
    config = {
        "scoring_prompt": settings.scoring_prompt or "(default)",
        "scoring_criteria": settings.scoring_criteria or [],
        "filter_rules": settings.filter_rules or {},
        "extraction_fields": settings.extraction_fields or [],
    }
    return json.dumps(config, indent=2)


async def _call_openrouter(api_key: str, model: str, messages: list[dict]) -> str:
    """Call OpenRouter chat completion and return the assistant message text."""
    if not api_key:
        raise AIServiceError("OpenRouter API key is not configured. Please set it in Settings.")

    headers = {
        "Authorization": f"Bearer {api_key.strip()}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://recruitee-ai-platform.local",
        "X-Title": "Recruitee AI Chat Assistant",
    }

    payload = {
        "model": (model or "openai/gpt-4o-mini").strip(),
        "messages": messages,
        "temperature": 0.4,
        "max_tokens": 4000,
    }

    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(
                f"{OPENROUTER_BASE_URL}/chat/completions",
                headers=headers,
                json=payload,
            )

        if response.status_code == 401:
            raise AIServiceError("Invalid OpenRouter API key.")
        if response.status_code == 402:
            raise AIServiceError("OpenRouter account has insufficient credits.")
        if response.status_code == 429:
            raise AIServiceError("OpenRouter rate limit exceeded. Please try again shortly.")
        if response.status_code >= 400:
            raise AIServiceError(f"OpenRouter returned HTTP {response.status_code}.")

        result = response.json()
        choices = result.get("choices", [])
        if not choices:
            raise AIServiceError("AI returned no response.")

        return choices[0].get("message", {}).get("content", "")

    except httpx.TimeoutException:
        raise AIServiceError("AI request timed out. Try again.")
    except httpx.ConnectError:
        raise AIServiceError("Cannot connect to OpenRouter.")
    except AIServiceError:
        raise
    except Exception as e:
        raise AIServiceError(f"Unexpected error: {str(e)}")


def _parse_assistant_response(raw: str) -> dict:
    """Parse the assistant's JSON response with fallbacks."""
    if not raw or not raw.strip():
        return {"message": "I didn't receive a proper response. Please try again.", "proposed_changes": []}

    text = raw.strip()

    # Strip markdown fences
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines).strip()

    # Find JSON
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        # Not JSON — treat the whole thing as a conversational message
        return {"message": text[:2000], "proposed_changes": []}

    try:
        data = json.loads(text[start:end + 1])
    except json.JSONDecodeError:
        return {"message": text[:2000], "proposed_changes": []}

    message = str(data.get("message", "Here are the proposed changes."))
    proposed = data.get("proposed_changes", [])

    if not isinstance(proposed, list):
        proposed = []

    valid_sections = {"scoring_prompt", "scoring_criteria", "filter_rules", "extraction_fields"}
    validated = []
    for change in proposed:
        if not isinstance(change, dict):
            continue
        section = change.get("section", "")
        if section not in valid_sections:
            continue
        validated.append({
            "section": section,
            "description": str(change.get("description", "Update " + section)),
            "new_value": change.get("new_value"),
        })

    return {"message": message, "proposed_changes": validated}


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/history", response_model=ChatHistoryResponse)
async def get_chat_history(db: AsyncSession = Depends(get_db)):
    """Get chat history (last 50 messages)."""
    result = await db.execute(
        select(ChatMessage).order_by(ChatMessage.created_at.asc()).limit(50)
    )
    messages = result.scalars().all()
    return ChatHistoryResponse(
        messages=[ChatMessageResponse.model_validate(m) for m in messages]
    )


@router.post("/send", response_model=ChatMessageResponse)
async def send_message(payload: ChatMessageRequest, db: AsyncSession = Depends(get_db)):
    """Send a message to the AI assistant and get configuration suggestions."""
    settings = await _get_settings(db)

    if not settings.openrouter_api_key:
        raise HTTPException(status_code=400, detail="OpenRouter API key not configured. Set it in Settings first.")

    # Save user message
    user_msg = ChatMessage(role="user", content=payload.message)
    db.add(user_msg)
    await db.commit()

    # Build conversation context with recent history
    history_result = await db.execute(
        select(ChatMessage).order_by(ChatMessage.created_at.desc()).limit(20)
    )
    history = list(reversed(history_result.scalars().all()))

    current_config = _build_current_config(settings)
    system_content = SYSTEM_PROMPT.replace("{current_config}", current_config)

    messages = [{"role": "system", "content": system_content}]
    for msg in history:
        if msg.role in ("user", "assistant"):
            content = msg.content
            # For assistant messages that had proposed changes, include a summary
            if msg.role == "assistant" and msg.proposed_changes:
                if msg.changes_applied:
                    content += "\n[These changes were APPLIED by the user.]"
                else:
                    content += "\n[These changes were proposed but NOT yet applied.]"
            messages.append({"role": msg.role, "content": content})

    try:
        raw_response = await _call_openrouter(
            api_key=settings.openrouter_api_key,
            model=settings.ai_model,
            messages=messages,
        )
    except AIServiceError as e:
        # Save error as assistant message
        error_msg = ChatMessage(role="assistant", content=f"Sorry, I encountered an error: {e.message}")
        db.add(error_msg)
        await db.commit()
        await db.refresh(error_msg)
        return ChatMessageResponse.model_validate(error_msg)

    parsed = _parse_assistant_response(raw_response)

    # Enrich proposed_changes with current values
    enriched_changes = []
    for change in parsed["proposed_changes"]:
        section = change["section"]
        current = None
        if section == "scoring_prompt":
            current = settings.scoring_prompt
        elif section == "scoring_criteria":
            current = settings.scoring_criteria
        elif section == "filter_rules":
            current = settings.filter_rules
        elif section == "extraction_fields":
            current = settings.extraction_fields
        enriched_changes.append({**change, "current_value": current})

    assistant_msg = ChatMessage(
        role="assistant",
        content=parsed["message"],
        proposed_changes=enriched_changes if enriched_changes else None,
    )
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(assistant_msg)

    return ChatMessageResponse.model_validate(assistant_msg)


@router.post("/apply", response_model=dict)
async def apply_changes(payload: ApplyChangesRequest, db: AsyncSession = Depends(get_db)):
    """Apply proposed changes from a chat message to settings."""
    result = await db.execute(
        select(ChatMessage).where(ChatMessage.id == payload.message_id)
    )
    msg = result.scalar_one_or_none()

    if not msg:
        raise HTTPException(status_code=404, detail="Message not found.")
    if msg.role != "assistant":
        raise HTTPException(status_code=400, detail="Can only apply changes from assistant messages.")
    if not msg.proposed_changes:
        raise HTTPException(status_code=400, detail="This message has no proposed changes.")
    if msg.changes_applied:
        raise HTTPException(status_code=400, detail="These changes have already been applied.")

    settings = await _get_settings(db)
    applied = []

    for change in msg.proposed_changes:
        section = change.get("section")
        new_value = change.get("new_value")

        if section == "scoring_prompt" and isinstance(new_value, str):
            settings.scoring_prompt = new_value
            applied.append("Scoring prompt")
        elif section == "scoring_criteria" and isinstance(new_value, list):
            # Validate weights sum
            total_weight = sum(c.get("weight", 0) for c in new_value if isinstance(c, dict))
            if total_weight > 0:  # Allow it even if not exactly 100, AI might round
                settings.scoring_criteria = new_value
                applied.append("Scoring criteria")
        elif section == "filter_rules" and isinstance(new_value, dict):
            settings.filter_rules = new_value
            applied.append("Filter rules")
        elif section == "extraction_fields" and isinstance(new_value, list):
            settings.extraction_fields = new_value
            applied.append("Extraction fields")

    if not applied:
        raise HTTPException(status_code=400, detail="No valid changes to apply.")

    msg.changes_applied = True
    await db.commit()

    return {
        "success": True,
        "applied": applied,
        "message": f"Applied changes to: {', '.join(applied)}",
    }


@router.delete("/history")
async def clear_chat_history(db: AsyncSession = Depends(get_db)):
    """Clear all chat history."""
    await db.execute(delete(ChatMessage))
    await db.commit()
    return {"success": True, "message": "Chat history cleared."}
