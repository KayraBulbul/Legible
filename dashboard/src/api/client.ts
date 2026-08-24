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
 * The dashboard has no identity of its own — it only ever holds a token
 * handed to it by pairing with an extension session (see src/context/auth).
 * Persisting it here means a page refresh doesn't force re-pairing.
 */
const ACCESS_TOKEN_STORAGE_KEY = "a11y-reader-access-token";

/**
 * Storage is unavailable in some privacy modes, and throws rather than
 * returning null — every access goes through these two helpers so a blocked
 * store degrades to "no persisted session" instead of a blank page.
 */
function readStoredAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredAccessToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    // Token simply won't survive the session.
  }
}

let accessToken: string | null = readStoredAccessToken();

export function setAccessToken(token: string | null): void {
  accessToken = token;
  writeStoredAccessToken(token);
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
  const url = new URL(
    `${API_BASE_URL}${API_PREFIX}${path}`,
    window.location.origin,
  );
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
        ? (
            payload as {
              error: Partial<ApiError> & { fields?: ApiErrorField[] };
            }
          ).error
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
    if (cause instanceof DOMException && cause.name === "AbortError")
      throw cause;
    throw new ApiError(0, "network_error", "Could not reach the server.");
  }

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/* -------------------------------------------------------------------- binary */

export interface BinaryResponse {
  blob: Blob;
  /** Decoded from `Content-Disposition`, RFC 5987 filename preferred. */
  filename: string | null;
}

function filenameFromDisposition(disposition: string | null): string | null {
  if (!disposition) return null;
  const encoded = /filename\*=UTF-8''([^;]+)/.exec(disposition)?.[1];
  if (encoded) return decodeURIComponent(encoded);
  return /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? null;
}

/**
 * Performs an authenticated request for a binary body, such as the PDF export
 * endpoint — {@link apiRequest} assumes a JSON response, so this stays
 * separate rather than teaching that path to branch on content type.
 */
export async function apiBlobRequest(
  path: string,
  { signal, query }: Pick<RequestOptions, "signal" | "query"> = {},
): Promise<BinaryResponse> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      signal,
      credentials: "omit",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError")
      throw cause;
    throw new ApiError(0, "network_error", "Could not reach the server.");
  }

  if (!response.ok) throw await toApiError(response);
  const blob = await response.blob();
  return {
    blob,
    filename: filenameFromDisposition(response.headers.get("Content-Disposition")),
  };
}
