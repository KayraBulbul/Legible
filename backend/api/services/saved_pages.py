import hashlib
import json
import re
from dataclasses import dataclass
from datetime import datetime
from typing import cast
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from api.errors import AppError
from api.schemas import SavedPageCreate, SavedPageUpdate
from api.services.content import sanitize_document
from database.models import SavedPage


@dataclass(frozen=True)
class SavedPageSummaryRecord:
    id: UUID
    original_url: str
    title: str
    excerpt: str
    is_favourited: bool
    tags: list[str]
    profile_id: UUID | None
    has_transformed_content: bool
    captured_at: datetime
    created_at: datetime
    updated_at: datetime


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _excerpt(text: str, maximum_length: int = 240) -> str:
    normalized = re.sub(r"\s+", " ", text).strip()
    return normalized[:maximum_length]


def _prepare_payload(payload: SavedPageCreate) -> SavedPageCreate:
    transformed = (
        sanitize_document(payload.transformed_document)
        if payload.transformed_document is not None
        else None
    )
    return payload.model_copy(
        update={
            "source_document": sanitize_document(payload.source_document),
            "transformed_document": transformed,
        }
    )


def _request_hash(payload: SavedPageCreate) -> str:
    serialized = json.dumps(
        payload.model_dump(mode="json", by_alias=True),
        sort_keys=True,
        separators=(",", ":"),
    )
    return _sha256(serialized)


async def _find_by_client_save_id(
    database: AsyncSession, user_id: UUID, client_save_id: UUID
) -> SavedPage | None:
    statement = select(SavedPage).where(
        SavedPage.user_id == user_id,
        SavedPage.client_save_id == client_save_id,
    )
    return cast(SavedPage | None, await database.scalar(statement))


def _resolve_existing(existing: SavedPage, request_hash: str) -> tuple[SavedPage, bool]:
    if existing.request_hash != request_hash:
        raise AppError(
            status_code=409,
            code="client_save_id_conflict",
            message="This clientSaveId was already used for a different saved page.",
        )
    return existing, False


async def create_saved_page(
    database: AsyncSession, user_id: UUID, payload: SavedPageCreate
) -> tuple[SavedPage, bool]:
    prepared = _prepare_payload(payload)
    request_hash = _request_hash(prepared)

    existing = await _find_by_client_save_id(database, user_id, prepared.client_save_id)
    if existing is not None:
        return _resolve_existing(existing, request_hash)

    source_data = prepared.source_document.model_dump(mode="json", by_alias=True)
    transformed_data = (
        prepared.transformed_document.model_dump(mode="json", by_alias=True)
        if prepared.transformed_document is not None
        else None
    )
    settings_data = prepared.accessibility_settings.model_dump(mode="json", by_alias=True)
    transformations_data = [
        item.model_dump(mode="json", by_alias=True) for item in prepared.transformations
    ]
    source_hash = "sha256:" + _sha256(
        f"{prepared.source_document.html}\x00{prepared.source_document.text}"
    )

    page = SavedPage(
        user_id=user_id,
        client_save_id=prepared.client_save_id,
        original_url=str(prepared.original_url),
        title=prepared.title,
        excerpt=_excerpt(prepared.source_document.text),
        source_document=source_data,
        transformed_document=transformed_data,
        accessibility_settings=settings_data,
        transformations=transformations_data,
        profile_id=prepared.profile_id,
        source_hash=source_hash,
        request_hash=request_hash,
        captured_at=prepared.captured_at,
    )
    database.add(page)

    try:
        await database.commit()
    except IntegrityError:
        await database.rollback()
        existing = await _find_by_client_save_id(database, user_id, prepared.client_save_id)
        if existing is None:
            raise
        return _resolve_existing(existing, request_hash)

    await database.refresh(page)
    return page, True


async def list_saved_pages(
    database: AsyncSession, user_id: UUID, limit: int, offset: int
) -> tuple[list[SavedPageSummaryRecord], int]:
    total_statement = (
        select(func.count()).select_from(SavedPage).where(SavedPage.user_id == user_id)
    )
    total = int(await database.scalar(total_statement) or 0)

    statement = (
        select(
            SavedPage.id,
            SavedPage.original_url,
            SavedPage.title,
            SavedPage.excerpt,
            SavedPage.is_favourited,
            SavedPage.tags,
            SavedPage.profile_id,
            func.coalesce(
                func.jsonb_typeof(SavedPage.transformed_document) == "object", False
            ).label("has_transformed_content"),
            SavedPage.captured_at,
            SavedPage.created_at,
            SavedPage.updated_at,
        )
        .where(SavedPage.user_id == user_id)
        .order_by(SavedPage.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = (await database.execute(statement)).all()
    items = [
        SavedPageSummaryRecord(
            id=row.id,
            original_url=row.original_url,
            title=row.title,
            excerpt=row.excerpt,
            is_favourited=row.is_favourited,
            tags=row.tags,
            profile_id=row.profile_id,
            has_transformed_content=row.has_transformed_content,
            captured_at=row.captured_at,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )
        for row in rows
    ]
    return items, total


async def get_saved_page(database: AsyncSession, user_id: UUID, page_id: UUID) -> SavedPage:
    statement = select(SavedPage).where(SavedPage.id == page_id, SavedPage.user_id == user_id)
    page = await database.scalar(statement)
    if page is None:
        raise AppError(404, "saved_page_not_found", "Saved page not found.")
    return page


async def update_saved_page(
    database: AsyncSession,
    user_id: UUID,
    page_id: UUID,
    payload: SavedPageUpdate,
) -> SavedPage:
    page = await get_saved_page(database, user_id, page_id)
    if payload.title is not None:
        page.title = payload.title
    if payload.is_favourited is not None:
        page.is_favourited = payload.is_favourited
    if payload.tags is not None:
        page.tags = payload.tags
    await database.commit()
    await database.refresh(page)
    return page


async def delete_saved_page(database: AsyncSession, user_id: UUID, page_id: UUID) -> None:
    page = await get_saved_page(database, user_id, page_id)
    await database.delete(page)
    await database.commit()
