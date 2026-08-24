import type {
  AiPreferences,
  SemanticDocument,
  TransformOperation,
  TransformResult,
  TransformationRecord,
} from "@/types";
import {
  SAMPLE_FOCUS,
  SAMPLE_RESTRUCTURED,
  SAMPLE_SIMPLIFIED,
  SAMPLE_SUMMARY,
} from "@/data/sampleContent";
import { USE_MOCK_API, apiRequest } from "@/api/client";
import { mockDelay } from "@/api/mock";

/* ============================================================================
 * AI REPOSITORY
 * ----------------------------------------------------------------------------
 * The dashboard's client for the Gemini-backed endpoint in
 * backend/ai/README.md and docs/api.md: `POST /api/v1/transformations`
 * (simplify/summarize/restructure/focus). Callers get domain types and never
 * see wire shapes.
 * ==========================================================================*/

/* ------------------------------------------------------------- wire mapping */

interface SemanticDocumentDto {
  format: "semantic_html";
  html: string;
  text: string;
  language: string | null;
}

interface TransformationOptionsDto {
  simplificationLevel: string;
  preserveTechnicalTerms: boolean;
}

interface TransformationRequestDto {
  operation: TransformOperation;
  input: SemanticDocumentDto;
  options: TransformationOptionsDto;
}

interface TransformationResponseDto {
  output: SemanticDocumentDto;
  metadata: TransformationRecord;
}

function toOptionsDto(options: AiPreferences): TransformationOptionsDto {
  return {
    simplificationLevel: options.simplificationLevel,
    preserveTechnicalTerms: options.preserveTechnicalTerms,
  };
}

/* ---------------------------------------------------------------- mock data */

const MOCK_TRANSFORM_TEXT: Record<TransformOperation, string> = {
  simplify: SAMPLE_SIMPLIFIED,
  summarize: SAMPLE_SUMMARY,
  restructure: SAMPLE_RESTRUCTURED,
  focus: SAMPLE_FOCUS,
};

function mockTransformDocument(
  operation: TransformOperation,
  input: SemanticDocument,
): SemanticDocument {
  const text = MOCK_TRANSFORM_TEXT[operation];
  return {
    format: "semantic_html",
    html: text.startsWith("<") ? text : `<p>${text}</p>`,
    text: text.replace(/<[^>]+>/g, ""),
    language: input.language,
  };
}

/* ------------------------------------------------------------------ requests */

/**
 * Runs `POST /api/v1/transformations` (docs/api.md). Synchronous and not
 * persisted server-side — callers decide whether to keep the result (e.g. by
 * caching it against the saved page, see `useAiTransform`).
 */
export async function transformContent(
  operation: TransformOperation,
  input: SemanticDocument,
  options: AiPreferences,
  signal?: AbortSignal,
): Promise<TransformResult> {
  if (USE_MOCK_API) {
    return mockDelay({
      document: mockTransformDocument(operation, input),
      metadata: {
        operation,
        provider: "mock",
        model: "mock-gemini",
        promptVersion: `${operation}-v1`,
        parameters: {
          simplificationLevel: options.simplificationLevel,
          preserveTechnicalTerms: options.preserveTechnicalTerms,
        },
        performedAt: new Date().toISOString(),
      },
    });
  }

  const dto = await apiRequest<TransformationResponseDto>("/transformations", {
    method: "POST",
    signal,
    body: {
      operation,
      input,
      options: toOptionsDto(options),
    } satisfies TransformationRequestDto,
  });

  return {
    document: dto.output,
    metadata: dto.metadata,
  };
}
