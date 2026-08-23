/* ============================================================================
 * HTTP TRANSPORT
 * ----------------------------------------------------------------------------
 * The single place the dashboard talks to the backend. Base URL, auth token,
 * JSON encoding and the error envelope are defined once here so the
 * repositories in this folder stay pure data-mapping. Implements the contract
 * in docs/api.md.
 * ==========================================================================*/

const RAW_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

/** Trailing slashes are stripped so path joins never double up. */
export const API_BASE_URL = RAW_BASE_URL.replace(/\/+$/, "");

const API_PREFIX = "/api/v1";

/**
 * Mock mode is the default until an API URL is configured, so the dashboard
 * runs standalone. Set VITE_API_BASE_URL (see .env.example) to go live, or
 * VITE_USE_MOCK_API=true to force fixtures against a configured backend.
 */
export const USE_MOCK_API =
  import.meta.env.VITE_USE_MOCK_API === "true" || API_BASE_URL === "";

export interface ApiErrorField {
  path: string;
  message: string;
}

/** The `error` envelope documented in docs/api.md, plus transport failures. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: ApiErrorField[];

  constructor(
    status: number,
    code: string,
    message: string,
    fields: ApiErrorField[] = [],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }

  /** The session is gone — callers should clear it and re-pair. */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

/* ------------------------------------------------------------------- session */

/**
 * Guest sessions are anonymous and short-lived, so the token lives in memory
 * only. Persistence (and recovery of a lost guest session) is still an open
 * decision in docs/api.md — when it lands, it lands here and nowhere else.
 */
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/* ------------------------------------------------------------------- request */

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  /** Serialised as JSON when present. */
  body?: unknown;
  signal?: AbortSignal;
  query?: Record<string, string | number | undefined>;
}

function buildUrl(path: string, query: RequestOptions["query"]): string {
  const url = new URL(`${API_BASE_URL}${API_PREFIX}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const payload: unknown = await response.json();
    const envelope =
      payload && typeof payload === "object" && "error" in payload
        ? (payload as { error: Partial<ApiError> & { fields?: ApiErrorField[] } })
            .error
        : null;
    if (envelope) {
      return new ApiError(
        response.status,
        envelope.code ?? "unknown_error",
        envelope.message ?? response.statusText,
        envelope.fields ?? [],
      );
    }
  } catch {
    // Non-JSON body (a proxy error page, say) — fall through to the default.
  }
  return new ApiError(response.status, "unknown_error", response.statusText);
}

/**
 * Performs an authenticated JSON request. Resolves with the decoded body, or
 * `undefined` for `204 No Content`; rejects with an {@link ApiError}.
 */
export async function apiRequest<T>(
  path: string,
  { method = "GET", body, signal, query }: RequestOptions = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      signal,
      // Never forward cookies from browsed sites — see docs/api.md.
      credentials: "omit",
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (cause) {
    // An aborted request is a caller decision, not a failure to report.
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new ApiError(0, "network_error", "Could not reach the server.");
  }

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
