from fastapi import APIRouter
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from api.dependencies import DatabaseSession
from api.errors import AppError
from api.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health(database: DatabaseSession) -> HealthResponse:
    try:
        await database.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise AppError(503, "database_unavailable", "The database is unavailable.") from exc
    return HealthResponse(status="ok", database="ok")
