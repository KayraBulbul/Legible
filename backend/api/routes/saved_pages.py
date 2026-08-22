from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, Response

from api.dependencies import CurrentUser, DatabaseSession, PdfExporter
from api.presenters import saved_page_response, saved_page_summary
from api.schemas import (
    ErrorResponse,
    Pagination,
    PdfContentMode,
    SavedPageCreate,
    SavedPageListResponse,
    SavedPageResponse,
    SavedPageUpdate,
)
from api.services.saved_pages import (
    create_saved_page,
    delete_saved_page,
    get_saved_page,
    list_saved_pages,
    update_saved_page,
)

router = APIRouter(
    prefix="/api/v1/saved-pages",
    tags=["saved pages"],
    responses={
        401: {"model": ErrorResponse, "description": "Authentication failed"},
        404: {"model": ErrorResponse, "description": "Saved page not found"},
        413: {"model": ErrorResponse, "description": "Request body is too large"},
        422: {"model": ErrorResponse, "description": "Validation error"},
    },
)


@router.post(
    "",
    response_model=SavedPageResponse,
    status_code=201,
    responses={
        200: {
            "model": SavedPageResponse,
            "description": "Existing idempotent save returned",
        }
    },
)
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


@router.get(
    "/{page_id}/export.pdf",
    response_class=Response,
    responses={
        200: {
            "content": {"application/pdf": {"schema": {"type": "string", "format": "binary"}}},
            "description": "Generated saved-page PDF",
            "headers": {
                "Content-Disposition": {
                    "description": "RFC 5987-compatible download filename",
                    "schema": {"type": "string"},
                },
                "X-Exported-Content": {
                    "description": "Selected saved-page content",
                    "schema": {"type": "string", "enum": ["source", "transformed"]},
                },
            },
        },
        409: {"model": ErrorResponse, "description": "Transformed content unavailable"},
        502: {"model": ErrorResponse, "description": "PDF rendering failed"},
        503: {"model": ErrorResponse, "description": "PDF rendering unavailable"},
    },
)
async def export_page_pdf(
    page_id: UUID,
    database: DatabaseSession,
    current_user: CurrentUser,
    exporter: PdfExporter,
    content: Annotated[PdfContentMode, Query()] = PdfContentMode.PREFERRED,
) -> Response:
    result = await exporter.export(database, current_user.id, page_id, content)
    return Response(
        content=result.content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": result.content_disposition,
            "X-Exported-Content": result.exported_content,
        },
    )


@router.patch("/{page_id}", response_model=SavedPageResponse)
async def rename_page(
    page_id: UUID,
    payload: SavedPageUpdate,
    database: DatabaseSession,
    current_user: CurrentUser,
) -> SavedPageResponse:
    page = await update_saved_page(database, current_user.id, page_id, payload)
    return saved_page_response(page)


@router.delete("/{page_id}", status_code=204, response_class=Response)
async def delete_page(
    page_id: UUID,
    database: DatabaseSession,
    current_user: CurrentUser,
) -> Response:
    await delete_saved_page(database, current_user.id, page_id)
    return Response(status_code=204)
