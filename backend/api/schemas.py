from datetime import datetime
from enum import StrEnum
from typing import Annotated, Literal
from uuid import UUID

from pydantic import (
    AnyHttpUrl,
    BaseModel,
    ConfigDict,
    Field,
    StrictBool,
    StringConstraints,
    field_validator,
    model_validator,
)
from pydantic.json_schema import SkipJsonSchema


def to_camel(value: str) -> str:
    first, *rest = value.split("_")
    return first + "".join(word.capitalize() for word in rest)


class ApiModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
        allow_inf_nan=False,
    )


class DyslexiaFont(StrEnum):
    NONE = "none"
    LEXEND = "lexend"
    OPEN_DYSLEXIC = "opendyslexic"


class ContrastMode(StrEnum):
    NONE = "none"
    DARK = "dark"
    LIGHT = "light"


class SimplificationLevel(StrEnum):
    LIGHT = "light"
    MODERATE = "moderate"
    STRONG = "strong"


class TransformationOperation(StrEnum):
    SIMPLIFY = "simplify"
    SUMMARIZE = "summarize"
    RESTRUCTURE = "restructure"
    FOCUS = "focus"
    IMAGE_DESCRIPTION = "image-description"


class TextTransformationOperation(StrEnum):
    SIMPLIFY = "simplify"
    SUMMARIZE = "summarize"
    RESTRUCTURE = "restructure"
    FOCUS = "focus"


class ImageDescriptionKind(StrEnum):
    IMAGE = "img"
    ICON_BUTTON = "icon-button"
    CANVAS = "canvas"


class ImageDescriptionRole(StrEnum):
    IMAGE = "img"
    FIGURE = "figure"
    GRAPHICS_DOCUMENT = "graphics-document"


class PdfContentMode(StrEnum):
    PREFERRED = "preferred"
    SOURCE = "source"
    TRANSFORMED = "transformed"


class AiPreferences(ApiModel):
    simplification_level: SimplificationLevel = SimplificationLevel.MODERATE
    preserve_technical_terms: bool = True


class AccessibilitySettings(ApiModel):
    schema_version: Literal[1] = 1
    dyslexia_font: DyslexiaFont = DyslexiaFont.NONE
    contrast_mode: ContrastMode = ContrastMode.NONE
    declutter: bool = False
    bionic_reading: bool = False
    font_scale: int = Field(default=100, ge=50, le=300)
    line_height: float | None = Field(default=None, ge=1, le=4)
    letter_spacing: float | None = None
    word_spacing: float | None = None
    reduced_motion: bool = False
    reading_width: float | None = None
    tts_rate: float = Field(default=1.0, ge=0.5, le=2)
    tts_pitch: float = Field(default=1.0, ge=0, le=2)
    voice_uri: str | None = Field(default=None, alias="voiceURI", max_length=500)
    hud_visible: bool = True
    ai_enabled: bool = True
    ai_preferences: AiPreferences = Field(default_factory=AiPreferences)


DocumentText = Annotated[str, StringConstraints(max_length=1_000_000)]
Tag = Annotated[str, StringConstraints(strict=True, min_length=1, max_length=50)]
TagList = Annotated[list[Tag], Field(max_length=20)]


class SemanticDocument(ApiModel):
    format: Literal["semantic_html"] = "semantic_html"
    html: DocumentText
    text: DocumentText
    language: str | None = Field(default=None, min_length=2, max_length=35)

    @field_validator("html", "text")
    @classmethod
    def reject_null_bytes(cls, value: str) -> str:
        if "\x00" in value:
            raise ValueError("null bytes are not allowed")
        return value


TransformationParameter = str | int | float | bool | None


class TransformationRecord(ApiModel):
    operation: TransformationOperation
    provider: str = Field(min_length=1, max_length=80)
    model: str = Field(min_length=1, max_length=120)
    prompt_version: str = Field(min_length=1, max_length=120)
    parameters: dict[str, TransformationParameter] = Field(default_factory=dict)
    performed_at: datetime

    @field_validator("performed_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.utcoffset() is None:
            raise ValueError("a timezone offset is required")
        return value


class TransformationRequest(ApiModel):
    operation: TextTransformationOperation
    input: SemanticDocument
    options: AiPreferences = Field(default_factory=AiPreferences)


class TransformationResponse(ApiModel):
    output: SemanticDocument
    metadata: TransformationRecord


ImageDataUrl = Annotated[str, StringConstraints(min_length=1, max_length=12_000_000)]


class ImageDescriptionRequest(ApiModel):
    kind: ImageDescriptionKind
    data_url: ImageDataUrl
    context_text: str | None = Field(default=None, max_length=10_000)


class AiProviderMetadata(ApiModel):
    provider: str = Field(min_length=1, max_length=80)
    model: str = Field(min_length=1, max_length=120)
    prompt_version: str = Field(min_length=1, max_length=120)
    performed_at: datetime

    @field_validator("performed_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.utcoffset() is None:
            raise ValueError("a timezone offset is required")
        return value


class ImageDescriptionResponse(ApiModel):
    alt_text: str = Field(min_length=1, max_length=2_000)
    role: ImageDescriptionRole | None = None
    cached: Literal[False] = False
    metadata: AiProviderMetadata


class SavedPageCreate(ApiModel):
    client_save_id: UUID
    original_url: AnyHttpUrl
    title: str = Field(min_length=1, max_length=512)
    captured_at: datetime
    source_document: SemanticDocument
    transformed_document: SemanticDocument | None = None
    accessibility_settings: AccessibilitySettings = Field(default_factory=AccessibilitySettings)
    transformations: list[TransformationRecord] = Field(default_factory=list, max_length=20)
    profile_id: None = None

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("title must not be blank")
        return value

    @field_validator("original_url")
    @classmethod
    def reject_url_credentials(cls, value: AnyHttpUrl) -> AnyHttpUrl:
        if value.username is not None or value.password is not None:
            raise ValueError("URL credentials are not allowed")
        return value

    @field_validator("captured_at")
    @classmethod
    def require_captured_timezone(cls, value: datetime) -> datetime:
        if value.utcoffset() is None:
            raise ValueError("a timezone offset is required")
        return value


class SavedPageUpdate(ApiModel):
    title: str | SkipJsonSchema[None] = Field(default=None, min_length=1, max_length=512)
    is_favourited: StrictBool | SkipJsonSchema[None] = None
    tags: TagList | SkipJsonSchema[None] = None

    @field_validator("title", "is_favourited", "tags", mode="before")
    @classmethod
    def reject_null_updates(cls, value: object) -> object:
        if value is None:
            raise ValueError("updated fields must not be null")
        return value

    @field_validator("tags", mode="before")
    @classmethod
    def normalize_tags(cls, value: object) -> object:
        if not isinstance(value, list):
            return value

        normalized: list[str] = []
        seen: set[str] = set()
        for tag in value:
            if not isinstance(tag, str):
                return value
            clean_tag = " ".join(tag.split()).casefold()
            if "\x00" in clean_tag:
                raise ValueError("tags must not contain null bytes")
            if clean_tag not in seen:
                normalized.append(clean_tag)
                seen.add(clean_tag)
        return normalized

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("title must not be blank")
        return value

    @model_validator(mode="after")
    def require_update(self) -> SavedPageUpdate:
        if not self.model_fields_set:
            raise ValueError("at least one field must be provided")
        return self


class SavedPageResponse(ApiModel):
    id: UUID
    client_save_id: UUID
    original_url: str
    title: str
    excerpt: str
    is_favourited: bool
    tags: TagList
    source_document: SemanticDocument
    transformed_document: SemanticDocument | None
    accessibility_settings: AccessibilitySettings
    transformations: list[TransformationRecord]
    profile_id: UUID | None
    source_hash: str
    captured_at: datetime
    created_at: datetime
    updated_at: datetime


class SavedPageSummary(ApiModel):
    id: UUID
    original_url: str
    title: str
    excerpt: str
    is_favourited: bool
    tags: TagList
    profile_id: UUID | None
    has_transformed_content: bool
    captured_at: datetime
    created_at: datetime
    updated_at: datetime


class Pagination(ApiModel):
    limit: int
    offset: int
    total: int


class SavedPageListResponse(ApiModel):
    items: list[SavedPageSummary]
    pagination: Pagination


class UserResponse(ApiModel):
    id: UUID
    kind: Literal["guest"]
    display_name: str | None
    created_at: datetime


class SessionResponse(ApiModel):
    access_token: str
    expires_at: datetime


class GuestSessionResponse(ApiModel):
    user: UserResponse
    session: SessionResponse


class PairingCodeResponse(ApiModel):
    code: str
    expires_at: datetime


class PairingCodeRedeem(ApiModel):
    code: str = Field(
        min_length=8,
        max_length=8,
        pattern=r"^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$",
    )


class HealthResponse(ApiModel):
    status: Literal["ok"]
    database: Literal["ok"]


class ErrorField(ApiModel):
    path: str
    message: str


class ErrorDetail(ApiModel):
    code: str
    message: str
    fields: list[ErrorField] | None = None


class ErrorResponse(ApiModel):
    error: ErrorDetail
