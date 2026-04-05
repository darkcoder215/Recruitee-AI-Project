"""OpenRouter AI scoring engine with comprehensive error handling."""

import json
import logging
import httpx
from typing import Any

logger = logging.getLogger(__name__)

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
REQUEST_TIMEOUT = 120.0
MAX_RETRIES = 2


class AIServiceError(Exception):
    """Raised when the AI scoring service encounters an error."""

    def __init__(self, message: str, retryable: bool = False):
        self.message = message
        self.retryable = retryable
        super().__init__(self.message)


def _build_candidate_prompt(candidate: dict, job: dict | None, scoring_prompt: str) -> str:
    """Build the prompt for candidate evaluation."""
    parts = [scoring_prompt, "\n\n--- CANDIDATE INFORMATION ---"]

    parts.append(f"Name: {candidate.get('name', 'Unknown')}")

    if candidate.get("resume_text"):
        text = candidate["resume_text"][:8000]  # Limit to avoid token overflow
        parts.append(f"\nResume/CV:\n{text}")

    if candidate.get("cover_letter"):
        text = candidate["cover_letter"][:3000]
        parts.append(f"\nCover Letter:\n{text}")

    if candidate.get("tags"):
        parts.append(f"\nTags: {', '.join(str(t) for t in candidate['tags'])}")

    if candidate.get("source"):
        parts.append(f"\nSource: {candidate['source']}")

    if job:
        parts.append("\n\n--- JOB INFORMATION ---")
        parts.append(f"Title: {job.get('title', 'N/A')}")
        if job.get("department"):
            parts.append(f"Department: {job['department']}")
        if job.get("description"):
            parts.append(f"\nDescription:\n{job['description'][:4000]}")
        if job.get("requirements"):
            parts.append(f"\nRequirements:\n{job['requirements'][:4000]}")

    parts.append(
        "\n\n--- RESPONSE FORMAT ---\n"
        "Respond ONLY with a valid JSON object (no markdown, no extra text):\n"
        '{"score": <int 0-100>, "summary": "<string>", "strengths": ["<string>", ...], '
        '"weaknesses": ["<string>", ...], "recommendation": "<strong_yes|yes|maybe|no|strong_no>"}'
    )

    return "\n".join(parts)


def _parse_ai_response(raw_text: str) -> dict:
    """Parse and validate AI response with extensive fallback handling."""
    if not raw_text or not raw_text.strip():
        raise AIServiceError("AI returned an empty response.")

    text = raw_text.strip()

    # Strip markdown code fences if present
    if text.startswith("```"):
        lines = text.split("\n")
        # Remove first and last lines (fences)
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines).strip()

    # Try to find JSON object in the response
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise AIServiceError(
            f"AI response does not contain valid JSON. Got: {text[:200]}"
        )

    json_str = text[start : end + 1]

    try:
        data = json.loads(json_str)
    except json.JSONDecodeError as e:
        raise AIServiceError(f"Failed to parse AI JSON response: {e}. Raw: {json_str[:300]}")

    # Validate and normalize fields
    score = data.get("score")
    if score is None:
        raise AIServiceError("AI response missing 'score' field.")
    try:
        score = int(float(score))
    except (ValueError, TypeError):
        raise AIServiceError(f"AI returned invalid score: {score}")
    if score < 0:
        score = 0
    if score > 100:
        score = 100

    summary = str(data.get("summary", "No summary provided."))
    if len(summary) > 2000:
        summary = summary[:2000] + "..."

    strengths = data.get("strengths", [])
    if not isinstance(strengths, list):
        strengths = [str(strengths)] if strengths else []
    strengths = [str(s) for s in strengths[:20]]

    weaknesses = data.get("weaknesses", [])
    if not isinstance(weaknesses, list):
        weaknesses = [str(weaknesses)] if weaknesses else []
    weaknesses = [str(w) for w in weaknesses[:20]]

    recommendation = str(data.get("recommendation", "maybe")).lower().strip()
    valid_recs = {"strong_yes", "yes", "maybe", "no", "strong_no"}
    if recommendation not in valid_recs:
        recommendation = "maybe"

    return {
        "score": score,
        "summary": summary,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "recommendation": recommendation,
    }


async def score_candidate(
    api_key: str,
    model: str,
    candidate: dict,
    job: dict | None,
    scoring_prompt: str,
) -> dict:
    """Score a candidate using OpenRouter AI."""
    if not api_key or not api_key.strip():
        raise AIServiceError("OpenRouter API key is not configured.")

    if not model or not model.strip():
        model = "openai/gpt-4o-mini"

    prompt = _build_candidate_prompt(candidate, job, scoring_prompt)

    headers = {
        "Authorization": f"Bearer {api_key.strip()}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://recruitee-ai-platform.local",
        "X-Title": "Recruitee AI Screening",
    }

    payload = {
        "model": model.strip(),
        "messages": [
            {
                "role": "system",
                "content": "You are an expert technical recruiter and HR professional. Always respond with valid JSON only.",
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.3,
        "max_tokens": 1500,
    }

    last_error = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
                response = await client.post(
                    f"{OPENROUTER_BASE_URL}/chat/completions",
                    headers=headers,
                    json=payload,
                )

            if response.status_code == 401:
                raise AIServiceError("Invalid OpenRouter API key. Please check your settings.")
            if response.status_code == 402:
                raise AIServiceError("OpenRouter account has insufficient credits. Please top up your account.")
            if response.status_code == 403:
                raise AIServiceError("Access denied by OpenRouter. Check your API key permissions.")
            if response.status_code == 404:
                raise AIServiceError(f"AI model '{model}' not found on OpenRouter. Please choose a valid model.")
            if response.status_code == 429:
                if attempt < MAX_RETRIES:
                    import asyncio
                    wait = 3 * attempt
                    logger.warning(f"OpenRouter rate limited. Retrying in {wait}s")
                    await asyncio.sleep(wait)
                    continue
                raise AIServiceError("OpenRouter rate limit exceeded. Please try again later.", retryable=True)
            if response.status_code >= 500:
                if attempt < MAX_RETRIES:
                    import asyncio
                    await asyncio.sleep(3 * attempt)
                    continue
                raise AIServiceError("OpenRouter service is temporarily unavailable.", retryable=True)

            response.raise_for_status()
            result = response.json()

            # Extract the text content
            choices = result.get("choices", [])
            if not choices:
                raise AIServiceError("AI returned no response choices.")

            message = choices[0].get("message", {})
            content = message.get("content", "")

            if not content:
                raise AIServiceError("AI returned an empty message.")

            return _parse_ai_response(content)

        except httpx.TimeoutException:
            last_error = AIServiceError(
                f"AI scoring request timed out after {REQUEST_TIMEOUT}s. The model may be overloaded.",
                retryable=True,
            )
            if attempt < MAX_RETRIES:
                import asyncio
                await asyncio.sleep(3 * attempt)
                continue
        except httpx.ConnectError:
            last_error = AIServiceError(
                "Could not connect to OpenRouter. Please check your internet connection.",
                retryable=True,
            )
            if attempt < MAX_RETRIES:
                import asyncio
                await asyncio.sleep(3 * attempt)
                continue
        except AIServiceError:
            raise
        except Exception as e:
            raise AIServiceError(f"Unexpected error during AI scoring: {str(e)}")

    raise last_error
