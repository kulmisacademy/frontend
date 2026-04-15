const DEFAULT_API = "http://localhost:4000";

/** RSC / build: avoid hanging when `NEXT_PUBLIC_API_URL` points at an unreachable host. */
export const SERVER_FETCH_TIMEOUT_MS = 12_000;

export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  return url || DEFAULT_API;
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
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...rest,
    headers,
    credentials: "omit",
  });
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

export async function apiPostForm<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    body: form,
  });
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
