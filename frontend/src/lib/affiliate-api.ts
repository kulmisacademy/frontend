import { apiFetch } from "@/lib/api";
import { getAffiliateToken } from "@/lib/affiliate-auth-storage";

export async function affiliateApiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = getAffiliateToken();
  return apiFetch<T>(path, { ...init, token });
}
