"""Saved searches and advanced search routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import SavedSearch
from app.schemas import (
    SavedSearchCreate,
    SavedSearchUpdate,
    SavedSearchResponse,
)

router = APIRouter(prefix="/api/saved-searches", tags=["saved-searches"])


@router.get("", response_model=list[SavedSearchResponse])
async def list_saved_searches(db: AsyncSession = Depends(get_db)):
    """List all saved searches."""
    result = await db.execute(select(SavedSearch).order_by(SavedSearch.updated_at.desc()))
    return result.scalars().all()


@router.post("", response_model=SavedSearchResponse)
async def create_saved_search(payload: SavedSearchCreate, db: AsyncSession = Depends(get_db)):
    """Create a new saved search."""
    # If setting as default, unset other defaults
    if payload.is_default:
        existing = await db.execute(select(SavedSearch).where(SavedSearch.is_default == True))
        for s in existing.scalars().all():
            s.is_default = False

    saved = SavedSearch(
        name=payload.name,
        description=payload.description,
        filters=payload.filters.model_dump(),
        is_default=payload.is_default,
    )
    db.add(saved)
    await db.commit()
    await db.refresh(saved)
    return saved


@router.put("/{search_id}", response_model=SavedSearchResponse)
async def update_saved_search(
    search_id: int, payload: SavedSearchUpdate, db: AsyncSession = Depends(get_db)
):
    """Update a saved search."""
    result = await db.execute(select(SavedSearch).where(SavedSearch.id == search_id))
    saved = result.scalar_one_or_none()
    if not saved:
        raise HTTPException(status_code=404, detail="Saved search not found.")

    update_data = payload.model_dump(exclude_unset=True)

    if "is_default" in update_data and update_data["is_default"]:
        existing = await db.execute(select(SavedSearch).where(SavedSearch.is_default == True))
        for s in existing.scalars().all():
            s.is_default = False

    if "filters" in update_data and update_data["filters"] is not None:
        update_data["filters"] = payload.filters.model_dump()

    for key, value in update_data.items():
        setattr(saved, key, value)

    await db.commit()
    await db.refresh(saved)
    return saved


@router.delete("/{search_id}")
async def delete_saved_search(search_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a saved search."""
    result = await db.execute(select(SavedSearch).where(SavedSearch.id == search_id))
    saved = result.scalar_one_or_none()
    if not saved:
        raise HTTPException(status_code=404, detail="Saved search not found.")
    await db.delete(saved)
    await db.commit()
    return {"success": True, "message": f"Saved search '{saved.name}' deleted."}
