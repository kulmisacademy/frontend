import { getApiBaseUrl } from "@/lib/api";
import { getAffiliateToken } from "@/lib/affiliate-auth-storage";

type FetchOptions = RequestInit & { token?: string | null };

/**
 * In the browser, affiliate routes use same-origin `/api/affiliate(-auth)/*`
 * so Next.js can proxy to Express (works when NEXT_PUBLIC_API_URL points at the
 * site by mistake, and avoids CORS). Server-side uses absolute API URL.
 */
function affiliateRequestUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (typeof window !== "undefined") {
    if (p.startsWith("/api/affiliate-auth") || p.startsWith("/api/affiliate")) {
      return p;
    }
  }
  return `${getApiBaseUrl().replace(/\/$/, "")}${p}`;
}

function sanitizeApiErrorBody(raw: string): string {
  const t = raw.trim();
  if (t.startsWith("<!DOCTYPE") || t.startsWith("<!doctype") || t.includes("<pre>")) {
    const m = t.match(/<pre>([\s\S]*?)<\/pre>/i);
    if (m) {
      const inner = m[1].trim();
      if (/Cannot POST|Cannot GET|Cannot PUT|Cannot PATCH|Cannot DELETE/i.test(inner)) {
        return `${inner} — Deploy the latest LAAS24 API (affiliate routes) or verify NEXT_PUBLIC_API_URL on Vercel points at your Express server.`;
      }
      return inner.length > 220 ? `${inner.slice(0, 220)}…` : inner;
    }
    return "The API returned an HTML error page instead of JSON. Check API deployment and environment variables.";
  }
  return t.length > 600 ? `${t.slice(0, 600)}…` : t;
}

async function affiliateJsonFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { token, headers: initHeaders, ...rest } = options;
  const headers = new Headers(initHeaders);
  if (
    !headers.has("Content-Type") &&
    rest.body &&
    !(rest.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url = affiliateRequestUrl(path);
  let res: Response;
  try {
    res = await fetch(url, { ...rest, headers, credentials: "omit" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      msg === "Failed to fetch" || msg.includes("NetworkError")
        ? `Cannot reach the API. ${typeof window !== "undefined" ? "Check your connection and try again." : ""}`
        : msg
    );
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = { error: sanitizeApiErrorBody(text) };
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

/** Register, login, resolve ref — optional Bearer for `/me`. */
export async function affiliateAuthApiFetch<T>(
  path: string,
  init: FetchOptions = {}
): Promise<T> {
  return affiliateJsonFetch<T>(path, init);
}

/** Dashboard calls (adds stored affiliate JWT). */
export async function affiliateApiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = getAffiliateToken();
  return affiliateJsonFetch<T>(path, { ...init, token });
}
