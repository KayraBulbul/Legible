from api.schemas import (
    AccessibilitySettings,
    SavedPageResponse,
    SavedPageSummary,
    SemanticDocument,
    TransformationRecord,
)
from api.services.saved_pages import SavedPageSummaryRecord
from database.models import SavedPage


def saved_page_response(page: SavedPage) -> SavedPageResponse:
    return SavedPageResponse(
        id=page.id,
        client_save_id=page.client_save_id,
        original_url=page.original_url,
        title=page.title,
        excerpt=page.excerpt,
        is_favourited=page.is_favourited,
        source_document=SemanticDocument.model_validate(page.source_document),
        transformed_document=(
            SemanticDocument.model_validate(page.transformed_document)
            if page.transformed_document is not None
            else None
        ),
        accessibility_settings=AccessibilitySettings.model_validate(page.accessibility_settings),
        transformations=[
            TransformationRecord.model_validate(item) for item in page.transformations
        ],
        profile_id=page.profile_id,
        source_hash=page.source_hash,
        captured_at=page.captured_at,
        created_at=page.created_at,
        updated_at=page.updated_at,
    )


def saved_page_summary(record: SavedPageSummaryRecord) -> SavedPageSummary:
    return SavedPageSummary(
        id=record.id,
        original_url=record.original_url,
        title=record.title,
        excerpt=record.excerpt,
        is_favourited=record.is_favourited,
        profile_id=record.profile_id,
        has_transformed_content=record.has_transformed_content,
        captured_at=record.captured_at,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )
