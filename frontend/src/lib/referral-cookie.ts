const STORAGE_KEY = "laas24_ref";
const COOKIE_NAME = "laas24_ref";

export function persistReferralCode(raw: string): void {
  const code = String(raw || "")
    .trim()
    .toUpperCase();
  if (!code || code.length < 4) return;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* ignore */
  }
  if (typeof document === "undefined") return;
  const maxAge = 90 * 24 * 60 * 60;
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(code)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

export function readReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const ls = localStorage.getItem(STORAGE_KEY);
    if (ls && ls.trim()) return ls.trim().toUpperCase();
  } catch {
    /* ignore */
  }
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`)
  );
  if (match?.[1]) {
    try {
      const v = decodeURIComponent(match[1]).trim().toUpperCase();
      if (v) return v;
    } catch {
      /* ignore */
    }
  }
  return null;
}
