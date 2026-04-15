export type VendorStore = {
  id: string;
  slug?: string | null;
  store_name: string;
  status: string;
  location: Record<string, string> | null;
  logo?: string | null;
  banner_url?: string | null;
  description?: string | null;
  whatsapp_phone?: string | null;
  plan?: "free" | "premium" | string;
  verified?: boolean;
  ai_generations_used?: number;
} | null;
