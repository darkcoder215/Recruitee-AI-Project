"""Vercel Python serverless entry point.

Vercel's Python runtime detects an ASGI `app` variable in this file and
serves it. We mount the FastAPI app defined in backend/app/main.py.
"""

import sys
import asyncio
from pathlib import Path

# Make `backend/` importable
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))

from app.main import app  # noqa: E402
from app.database import init_db  # noqa: E402

# Ensure DB tables exist on cold start (lifespan handlers don't run on every
# Vercel invocation reliably, so we trigger init_db explicitly once).
_initialized = False


@app.on_event("startup")
async def _ensure_db_initialized():
    global _initialized
    if not _initialized:
        try:
            await init_db()
            _initialized = True
        except Exception:
            pass


# Vercel picks up this `app` symbol automatically.
