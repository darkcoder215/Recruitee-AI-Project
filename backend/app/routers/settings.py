"""Settings API routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Settings
from app.schemas import SettingsUpdate, SettingsResponse

router = APIRouter(prefix="/api/settings", tags=["settings"])


async def _get_or_create_settings(db: AsyncSession) -> Settings:
    result = await db.execute(select(Settings).where(Settings.id == 1))
    settings = result.scalar_one_or_none()
    if not settings:
        settings = Settings(id=1)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    return settings


@router.get("", response_model=SettingsResponse)
async def get_settings(db: AsyncSession = Depends(get_db)):
    """Get current settings (API keys are masked)."""
    settings = await _get_or_create_settings(db)
    return SettingsResponse(
        recruitee_api_token_set=bool(settings.recruitee_api_token),
        recruitee_company_id=settings.recruitee_company_id,
        openrouter_api_key_set=bool(settings.openrouter_api_key),
        ai_model=settings.ai_model or "openai/gpt-4o-mini",
        scoring_prompt=settings.scoring_prompt or "",
        updated_at=settings.updated_at,
    )


@router.put("", response_model=SettingsResponse)
async def update_settings(payload: SettingsUpdate, db: AsyncSession = Depends(get_db)):
    """Update settings. Only provided fields are updated."""
    settings = await _get_or_create_settings(db)

    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update.")

    for key, value in update_data.items():
        setattr(settings, key, value)

    await db.commit()
    await db.refresh(settings)

    return SettingsResponse(
        recruitee_api_token_set=bool(settings.recruitee_api_token),
        recruitee_company_id=settings.recruitee_company_id,
        openrouter_api_key_set=bool(settings.openrouter_api_key),
        ai_model=settings.ai_model or "openai/gpt-4o-mini",
        scoring_prompt=settings.scoring_prompt or "",
        updated_at=settings.updated_at,
    )


@router.post("/test-recruitee")
async def test_recruitee_connection(db: AsyncSession = Depends(get_db)):
    """Test Recruitee API connection."""
    settings = await _get_or_create_settings(db)

    if not settings.recruitee_api_token or not settings.recruitee_company_id:
        raise HTTPException(
            status_code=400,
            detail="Recruitee API token and Company ID must be configured first.",
        )

    from app.services.recruitee import RecruiteeClient, RecruiteeAPIError

    try:
        client = RecruiteeClient(settings.recruitee_company_id, settings.recruitee_api_token)
        offers = await client.list_offers()
        return {"success": True, "message": f"Connected successfully. Found {len(offers)} job offer(s)."}
    except RecruiteeAPIError as e:
        raise HTTPException(status_code=400, detail=str(e.message))


@router.post("/test-openrouter")
async def test_openrouter_connection(db: AsyncSession = Depends(get_db)):
    """Test OpenRouter API connection."""
    settings = await _get_or_create_settings(db)

    if not settings.openrouter_api_key:
        raise HTTPException(
            status_code=400,
            detail="OpenRouter API key must be configured first.",
        )

    import httpx

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                "https://openrouter.ai/api/v1/models",
                headers={"Authorization": f"Bearer {settings.openrouter_api_key}"},
            )
        if response.status_code == 401:
            raise HTTPException(status_code=400, detail="Invalid OpenRouter API key.")
        if response.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail=f"OpenRouter returned HTTP {response.status_code}.",
            )
        data = response.json()
        model_count = len(data.get("data", []))
        return {"success": True, "message": f"Connected successfully. {model_count} models available."}
    except httpx.TimeoutException:
        raise HTTPException(status_code=400, detail="Connection to OpenRouter timed out.")
    except httpx.ConnectError:
        raise HTTPException(status_code=400, detail="Could not connect to OpenRouter.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
