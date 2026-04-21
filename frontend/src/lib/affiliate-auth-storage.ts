const TOKEN_KEY = "laas24_affiliate_token";
const USER_KEY = "laas24_affiliate";

export type AffiliateUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  ref_code: string;
};

export function getAffiliateToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getAffiliateUser(): AffiliateUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AffiliateUser;
  } catch {
    return null;
  }
}

export function setAffiliateSession(token: string, user: AffiliateUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAffiliateSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
