import json
from dataclasses import dataclass
from typing import Protocol, cast

from google import genai
from google.genai import errors as genai_errors
from google.genai import types
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from ai.errors import GeminiProviderError, GeminiRateLimitError, GeminiUnavailableError
from ai.prompts import IMAGE_PROMPTS, TRANSFORM_PROMPTS
from api.schemas import (
    AiPreferences,
    ImageDescriptionKind,
    ImageDescriptionRole,
    SemanticDocument,
    TextTransformationOperation,
)


@dataclass(frozen=True)
class GeminiTransformation:
    document: SemanticDocument
    model: str
    prompt_version: str


@dataclass(frozen=True)
class GeminiImageDescription:
    alt_text: str
    role: ImageDescriptionRole | None
    model: str
    prompt_version: str


class GeminiService(Protocol):
    async def transform(
        self,
        operation: TextTransformationOperation,
        document: SemanticDocument,
        options: AiPreferences,
    ) -> GeminiTransformation: ...

    async def describe_image(
        self,
        kind: ImageDescriptionKind,
        image: bytes,
        mime_type: str,
        context_text: str | None,
    ) -> GeminiImageDescription: ...

    async def close(self) -> None: ...


class _TransformationOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    html: str = Field(max_length=1_000_000)
    text: str = Field(max_length=1_000_000)
    language: str | None = Field(default=None, min_length=2, max_length=35)


class _ImageDescriptionOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    alt_text: str = Field(alias="altText", min_length=1, max_length=2_000)
    role: ImageDescriptionRole | None = None


class GoogleGeminiService:
    def __init__(self, api_key: str | None, model: str) -> None:
        self._api_key = api_key
        self._model = model
        self._client: genai.Client | None = None

    async def transform(
        self,
        operation: TextTransformationOperation,
        document: SemanticDocument,
        options: AiPreferences,
    ) -> GeminiTransformation:
        prompt_version, instruction = TRANSFORM_PROMPTS[operation.value]
        prompt = (
            f"{instruction}\n\n"
            f"Options: {json.dumps(options.model_dump(mode='json', by_alias=True))}\n\n"
            "Populate the response schema with semantic HTML, equivalent plain text, and the "
            "document language. Preserve factual meaning and never add scripts, forms, iframes, "
            "event handlers, or remote assets.\n\n"
            f"Semantic HTML:\n{document.html}\n\nPlain text fallback:\n{document.text}"
        )
        output = await self._generate(prompt, _TransformationOutput)
        assert isinstance(output, _TransformationOutput)
        try:
            transformed = SemanticDocument(
                html=output.html,
                text=output.text,
                language=output.language or document.language,
            )
        except ValidationError as exc:
            raise GeminiProviderError from exc
        return GeminiTransformation(
            document=transformed,
            model=self._model,
            prompt_version=prompt_version,
        )

    async def describe_image(
        self,
        kind: ImageDescriptionKind,
        image: bytes,
        mime_type: str,
        context_text: str | None,
    ) -> GeminiImageDescription:
        prompt_version, instruction = IMAGE_PROMPTS[kind.value]
        prompt = instruction
        if context_text:
            prompt = f"{prompt}\n\nNearby page text for context:\n{context_text}"
        contents = cast(
            types.ContentListUnion,
            [prompt, types.Part.from_bytes(data=image, mime_type=mime_type)],
        )
        output = await self._generate(contents, _ImageDescriptionOutput)
        assert isinstance(output, _ImageDescriptionOutput)
        role = None if kind is ImageDescriptionKind.ICON_BUTTON else output.role
        return GeminiImageDescription(
            alt_text=output.alt_text,
            role=role,
            model=self._model,
            prompt_version=prompt_version,
        )

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aio.aclose()
            self._client = None

    async def _generate(
        self,
        contents: types.ContentListUnion,
        response_schema: type[_TransformationOutput] | type[_ImageDescriptionOutput],
    ) -> _TransformationOutput | _ImageDescriptionOutput:
        try:
            client = self._get_client()
            response = await client.aio.models.generate_content(
                model=self._model,
                contents=contents,
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    response_mime_type="application/json",
                    response_schema=response_schema,
                ),
            )
        except GeminiUnavailableError:
            raise
        except genai_errors.APIError as exc:
            if exc.code == 429:
                raise GeminiRateLimitError from exc
            raise GeminiProviderError from exc
        except Exception as exc:
            raise GeminiProviderError from exc

        try:
            if isinstance(response.parsed, response_schema):
                return response.parsed
            if not response.text:
                raise GeminiProviderError
            return response_schema.model_validate_json(response.text)
        except (ValidationError, ValueError, GeminiProviderError) as exc:
            raise GeminiProviderError from exc

    def _get_client(self) -> genai.Client:
        if not self._api_key:
            raise GeminiUnavailableError
        if self._client is None:
            self._client = genai.Client(api_key=self._api_key)
        return self._client
