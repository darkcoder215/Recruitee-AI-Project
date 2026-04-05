"""Recruitee AI Screening Platform - Backend API."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.database import init_db
from app.routers import settings, jobs, candidates, chat

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database...")
    await init_db()
    logger.info("Database ready.")
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title="Recruitee AI Screening Platform",
    description="Import candidates from Recruitee, score them with AI, and manage your hiring pipeline.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure specific origins for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(settings.router)
app.include_router(jobs.router)
app.include_router(candidates.router)
app.include_router(chat.router)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled error on {request.method} {request.url.path}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An unexpected internal error occurred. Please try again later.",
            "error_type": type(exc).__name__,
        },
    )


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "recruitee-ai-screening"}
