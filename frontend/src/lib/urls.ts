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

/** Path only; use with `Link` from `@/i18n/navigation` (locale prefix applied automatically). */
export function productPath(id: string): string {
  return `/product/${id}`;
}

/** Absolute product URL including locale segment (e.g. WhatsApp share links). */
export function productAbsoluteUrl(id: string, locale: string): string {
  return `${getSiteBase()}/${locale}/product/${id}`;
}
