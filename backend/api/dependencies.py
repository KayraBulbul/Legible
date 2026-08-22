from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from api.config import get_settings
from api.errors import AppError
from api.services.auth import AuthenticatedSession, find_authenticated_session
from api.services.pdf_exports import PdfExportService
from database.models import User
from database.session import get_database_session
from pdf.renderers import WeasyPrintRenderer

bearer_scheme = HTTPBearer(auto_error=False)

DatabaseSession = Annotated[AsyncSession, Depends(get_database_session)]


async def get_authenticated_session(
    database: DatabaseSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> AuthenticatedSession:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AppError(401, "authentication_required", "A valid bearer token is required.")

    authenticated = await find_authenticated_session(database, credentials.credentials)
    if authenticated is None:
        raise AppError(401, "invalid_access_token", "The access token is invalid or expired.")
    return authenticated


CurrentSession = Annotated[AuthenticatedSession, Depends(get_authenticated_session)]


async def get_current_user(authenticated: CurrentSession) -> User:
    return authenticated.user


CurrentUser = Annotated[User, Depends(get_current_user)]


@lru_cache
def get_pdf_export_service() -> PdfExportService:
    settings = get_settings()
    renderer = WeasyPrintRenderer(settings.pdf_render_timeout_seconds)
    return PdfExportService(renderer, settings.pdf_render_concurrency)


PdfExporter = Annotated[PdfExportService, Depends(get_pdf_export_service)]
