/** Same-origin admin API (cookie session + Next → Express proxy). */

function parseJsonSafe(text: string): unknown {
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { error: text };
  }
}

function stringifyUnknownErr(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (v && typeof v === "object") {
    try {
      const j = JSON.stringify(v);
      return j.length > 420 ? `${j.slice(0, 420)}…` : j;
    } catch {
      return null;
    }
  }
  return null;
}

function formatAdminFailureMessage(
  status: number,
  data: {
    error?: unknown;
    message?: unknown;
    detail?: unknown;
    hint?: unknown;
    details?: unknown;
  } | null
): string {
  const base =
    stringifyUnknownErr(data?.error) ||
    stringifyUnknownErr(data?.message) ||
    `Request failed (${status})`;
  const bits = [
    stringifyUnknownErr(data?.detail),
    stringifyUnknownErr(data?.details),
    stringifyUnknownErr(data?.hint),
  ].filter((s): s is string => Boolean(s));
  const msg = bits.length ? `${base} — ${bits.join(" · ")}` : base;
  return msg.trim() || `Request failed (${status})`;
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
  let res: Response;
  try {
    res = await fetch(url, {
      credentials: "include",
      ...init,
      headers,
    });
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    if (/CERT|certificate|SSL|TLS|UNABLE_TO_VERIFY|ERR_CERT/i.test(m)) {
      throw new Error(
        "Browser could not verify a secure connection. Check VPN/antivirus HTTPS scanning, or ask your host to fix TLS on the API domain. On Vercel, set LAAS24_API_URL to your Express API base URL (trusted certificate)."
      );
    }
    if (m === "Failed to fetch" || m.includes("NetworkError") || m.includes("Load failed")) {
      throw new Error(
        "Network error talking to the admin API. Check that you are online and the site can reach the backend (LAAS24_API_URL / NEXT_PUBLIC_API_URL on the server)."
      );
    }
    throw e instanceof Error ? e : new Error(m || "Request failed");
  }
  const text = await res.text();
  if (res.status === 204) {
    return undefined as T;
  }
  const data = parseJsonSafe(text) as {
    error?: unknown;
    message?: unknown;
    detail?: unknown;
    hint?: unknown;
    details?: unknown;
  } | null;
  if (!res.ok) {
    throw new Error(formatAdminFailureMessage(res.status, data));
  }
  return data as T;
}
