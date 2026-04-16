const DEFAULT_API = "http://localhost:4000";

/** RSC / build: avoid hanging when `NEXT_PUBLIC_API_URL` points at an unreachable host. */
export const SERVER_FETCH_TIMEOUT_MS = 12_000;

/** Matches backend multer limit for store logo/banner (`vendor.routes.js`). */
export const VENDOR_STORE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  return url || DEFAULT_API;
}

function isBrowserNetworkFailure(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const m = err.message;
  return (
    m === "Failed to fetch" ||
    m.includes("NetworkError") ||
    m.includes("Load failed")
  );
}

/**
 * When `fetch` fails before any HTTP response (wrong URL, CORS, offline,
 * `ERR_CONNECTION_RESET`, etc.).
 */
export function describeUnreachableApiError(): string {
  const api = getApiBaseUrl();
  if (typeof window === "undefined") {
    return `Cannot reach the API at ${api}.`;
  }
  const here = window.location.origin;
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(here);
  return isLocal
    ? `Cannot reach the API at ${api}. Start the backend and set NEXT_PUBLIC_API_URL (e.g. http://localhost:4000).`
    : `Cannot reach the API at ${api}. Confirm the API is running and NEXT_PUBLIC_API_URL is correct; set FRONTEND_URL on the API to ${here} (no trailing slash) for CORS. For uploads, use images under 5 MB each; if errors continue, your host may need a higher request body limit.`;
}

function rethrowFetchFailure(err: unknown): never {
  if (isBrowserNetworkFailure(err)) {
    throw new Error(describeUnreachableApiError());
  }
  throw err instanceof Error ? err : new Error(String(err));
}

type FetchOptions = RequestInit & { token?: string | null };

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { token, headers: initHeaders, ...rest } = options;
  const headers = new Headers(initHeaders);
  if (!headers.has("Content-Type") && rest.body && !(rest.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  let res: Response;
  try {
    res = await fetch(`${getApiBaseUrl()}${path}`, {
      ...rest,
      headers,
      credentials: "omit",
    });
  } catch (e) {
    rethrowFetchFailure(e);
  }
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = { error: text };
    }
  }
  if (!res.ok) {
    const err = data as { error?: unknown; message?: string };
    let msg: string;
    if (typeof err?.error === "string") {
      msg = err.error;
    } else if (err?.error && typeof err.error === "object") {
      msg = "Please check the form fields and try again.";
    } else if (typeof err?.message === "string") {
      msg = err.message;
    } else {
      msg = `Request failed (${res.status})`;
    }
    throw new Error(msg);
  }
  return data as T;
}

export type ApiPostFormOptions = { token?: string | null };

export async function apiPostForm<T>(
  path: string,
  form: FormData,
  options: ApiPostFormOptions = {}
): Promise<T> {
  const { token } = options;
  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  let res: Response;
  try {
    res = await fetch(`${getApiBaseUrl()}${path}`, {
      method: "POST",
      body: form,
      headers,
      credentials: "omit",
    });
  } catch (e) {
    rethrowFetchFailure(e);
  }
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = { error: text };
    }
  }
  if (!res.ok) {
    const err = data as {
      error?: unknown;
      message?: string;
      details?: string;
      hint?: string;
    };
    let msg: string;
    if (typeof err?.error === "string") {
      msg = err.error;
      if (typeof err.details === "string" && err.details.trim()) {
        msg = `${msg} — ${err.details}`;
      } else if (typeof err.hint === "string" && err.hint.trim()) {
        msg = `${msg} — ${err.hint}`;
      }
    } else if (err?.error && typeof err.error === "object") {
      msg = "Please check the form fields and try again.";
    } else if (typeof err?.message === "string") {
      msg = err.message;
    } else {
      msg = `Request failed (${res.status})`;
    }
    throw new Error(msg);
  }
  return data as T;
}
