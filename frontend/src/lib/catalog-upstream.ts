import { getApiBaseUrl } from "@/lib/api";

/** Max wait for Express catalog API (avoids hanging Next route handlers). */
export const CATALOG_UPSTREAM_MS = 25_000;

function assertCatalogPath(path: string): void {
  const pathname = path.split("?")[0] ?? "";
  if (!pathname.startsWith("/api/catalog/")) {
    throw new Error(`Invalid catalog path: ${path}`);
  }
}

export async function catalogGet(path: string): Promise<Response> {
  assertCatalogPath(path);
  return fetch(`${getApiBaseUrl()}${path}`, {
    signal: AbortSignal.timeout(CATALOG_UPSTREAM_MS),
  });
}

export async function catalogPostJson(path: string, body: string): Promise<Response> {
  assertCatalogPath(path);
  return fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    signal: AbortSignal.timeout(CATALOG_UPSTREAM_MS),
  });
}
