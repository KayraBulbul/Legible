from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, Response

from api.dependencies import CurrentUser, DatabaseSession
from api.presenters import saved_page_response, saved_page_summary
from api.schemas import Pagination, SavedPageCreate, SavedPageListResponse, SavedPageResponse
from api.services.saved_pages import create_saved_page, get_saved_page, list_saved_pages

router = APIRouter(prefix="/api/v1/saved-pages", tags=["saved pages"])


@router.post("", response_model=SavedPageResponse, status_code=201)
async def create_page(
    payload: SavedPageCreate,
    response: Response,
    database: DatabaseSession,
    current_user: CurrentUser,
) -> SavedPageResponse:
    page, created = await create_saved_page(database, current_user.id, payload)
    if not created:
        response.status_code = 200
    return saved_page_response(page)


@router.get("", response_model=SavedPageListResponse)
async def list_pages(
    database: DatabaseSession,
    current_user: CurrentUser,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> SavedPageListResponse:
    records, total = await list_saved_pages(database, current_user.id, limit, offset)
    return SavedPageListResponse(
        items=[saved_page_summary(record) for record in records],
        pagination=Pagination(limit=limit, offset=offset, total=total),
    )


@router.get("/{page_id}", response_model=SavedPageResponse)
async def retrieve_page(
    page_id: UUID,
    database: DatabaseSession,
    current_user: CurrentUser,
) -> SavedPageResponse:
    page = await get_saved_page(database, current_user.id, page_id)
    return saved_page_response(page)
