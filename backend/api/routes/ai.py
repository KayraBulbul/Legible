from fastapi import APIRouter

from api.dependencies import AiService, CurrentUser, DatabaseSession
from api.schemas import (
    ErrorResponse,
    ImageDescriptionRequest,
    ImageDescriptionResponse,
    TransformationRequest,
    TransformationResponse,
)

router = APIRouter(
    prefix="/api/v1",
    tags=["AI"],
    responses={
        401: {"model": ErrorResponse, "description": "Authentication failed"},
        413: {"model": ErrorResponse, "description": "Request body or image is too large"},
        422: {"model": ErrorResponse, "description": "Validation error"},
        429: {"model": ErrorResponse, "description": "AI rate limit reached"},
        502: {"model": ErrorResponse, "description": "AI provider failed"},
        503: {"model": ErrorResponse, "description": "AI service unavailable"},
    },
)


@router.post("/transformations", response_model=TransformationResponse)
async def transform_document(
    payload: TransformationRequest,
    database: DatabaseSession,
    current_user: CurrentUser,
    service: AiService,
) -> TransformationResponse:
    return await service.transform(database, current_user.id, payload)


@router.post(
    "/image-descriptions",
    response_model=ImageDescriptionResponse,
    responses={415: {"model": ErrorResponse, "description": "Unsupported image type"}},
)
async def describe_image(
    payload: ImageDescriptionRequest,
    database: DatabaseSession,
    current_user: CurrentUser,
    service: AiService,
) -> ImageDescriptionResponse:
    return await service.describe_image(database, current_user.id, payload)
