/**
 * Public site origin for absolute links (WhatsApp, metadata).
 * Must not use `window` — that caused SSR/client href mismatches on ProductCard.
 * Prefer NEXT_PUBLIC_SITE_URL; in dev without env, default to localhost so SSR matches the client.
 */
export function getSiteBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }
  return "https://laas24.com";
}

export function productUrl(id: string): string {
  return `${getSiteBase()}/product/${id}`;
}
