/** Matches GET /api/vendor/plan */
export type PlanPayload = {
  store: {
    id: string;
    store_name: string;
    /** Effective plan slug (limits) */
    plan: string;
    planName?: string;
    planId?: string;
    planExpiresAt?: string | null;
    planAssignmentExpired?: boolean;
    /** List price from subscription_plans (same currency you use in admin UI). */
    planPrice?: number;
    verified: boolean;
    verifiedExpiresAt?: string | null;
  };
  limits: {
    maxProducts: number;
    maxVideos: number;
    /** When set, AI is limited per UTC calendar day. */
    maxAiDaily?: number | null;
    maxAiGenerations: number | null;
  };
  usage: {
    products: number;
    videos: number;
    aiGenerations: number;
    /** Uses counted for the current UTC day when the plan has a daily AI cap. */
    aiGenerationsToday?: number;
  };
};

/** GET /api/vendor/plan-catalog */
export type CatalogPlan = {
  id: string;
  name: string;
  slug: string;
  /** List price (admin-set); defaults to 0 if missing. */
  price?: number;
  productLimit: number;
  videoLimit: number;
  aiUnlimited: boolean;
  aiLimit: number | null;
  /** Per UTC day; null = no daily cap (use lifetime aiLimit if any). */
  aiDailyLimit?: number | null;
};
