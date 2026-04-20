/** Same-origin admin API (cookie session + Next → Express proxy). */

function parseJsonSafe(text: string): unknown {
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { error: text };
  }
}

export async function adminFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const p = path.startsWith("/") ? path : `/${path}`;
  const url = `/api/admin${p}`;
  const headers = new Headers(init?.headers);
  if (
    init?.body &&
    typeof init.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(url, {
    credentials: "include",
    ...init,
    headers,
  });
  const text = await res.text();
  if (res.status === 204) {
    return undefined as T;
  }
  const data = parseJsonSafe(text) as {
    error?: string;
    message?: string;
    detail?: string;
    hint?: string;
    details?: string;
  } | null;
  if (!res.ok) {
    const base =
      (typeof data?.error === "string" && data.error) ||
      (typeof data?.message === "string" && data.message) ||
      `Request failed (${res.status})`;
    const bits = [
      typeof data?.detail === "string" && data.detail.trim()
        ? data.detail.trim()
        : "",
      typeof data?.details === "string" && data.details.trim()
        ? data.details.trim()
        : "",
      typeof data?.hint === "string" && data.hint.trim() ? data.hint.trim() : "",
    ].filter(Boolean);
    const msg = bits.length ? `${base} — ${bits.join(" · ")}` : base;
    throw new Error(msg);
  }
  return data as T;
}
