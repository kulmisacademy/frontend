const subscriptionPlanModel = require("../models/subscription-plan.model");

function planExpired(store) {
  if (!store?.plan_expires_at) return false;
  return new Date(store.plan_expires_at) <= new Date();
}

function verifiedEffective(store) {
  if (!store?.verified) return false;
  if (!store.verified_expires_at) return true;
  return new Date(store.verified_expires_at) > new Date();
}

function utcTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

/** AI uses so far today (UTC calendar day), resetting when the stored date is not today. */
function effectiveAiDailyUsed(store) {
  if (!store) return 0;
  const today = utcTodayDateString();
  const raw = store.ai_generations_daily_utc_date;
  const stored = raw ? String(raw).slice(0, 10) : null;
  if (stored !== today) return 0;
  const n = Number(store.ai_generations_daily_used ?? 0);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function planRowToLimits(row) {
  if (!row) {
    return {
      maxProducts: 20,
      maxVideos: 5,
      maxAiGenerations: 1,
      maxAiDaily: null,
    };
  }
  const dailyRaw = row.ai_daily_limit;
  const maxAiDaily =
    dailyRaw != null && Number.isFinite(Number(dailyRaw)) && Number(dailyRaw) >= 0
      ? Number(dailyRaw)
      : null;
  const totalCap =
    row.ai_limit == null || row.ai_limit === ""
      ? Infinity
      : Number(row.ai_limit);
  return {
    maxProducts: row.product_limit,
    maxVideos: row.video_limit,
    /** When set, AI is capped per UTC day (see maxAiDaily). */
    maxAiDaily: maxAiDaily,
    /**
     * Lifetime total cap when maxAiDaily is null; when maxAiDaily is set, enforcement
     * uses daily counters only (this is omitted in API as null for clarity).
     */
    maxAiGenerations: maxAiDaily != null ? null : totalCap,
  };
}

/**
 * Subscription row used for limits (falls back to Free when unassigned or expired).
 */
async function getEffectivePlanRow(store) {
  const free = await subscriptionPlanModel.findBySlug("free");
  if (!free) {
    throw new Error("Database missing subscription_plans row slug=free");
  }
  const premium = await subscriptionPlanModel.findBySlug("premium");
  if (store?.plan_id && !planExpired(store)) {
    const row = await subscriptionPlanModel.findById(store.plan_id);
    if (row && row.active !== false) return row;
  }
  if (!store?.plan_id && (store?.plan || "free") === "premium" && !planExpired(store)) {
    if (premium && premium.active !== false) return premium;
  }
  return free;
}

async function getStorePlanSummary(store) {
  const planRow = await getEffectivePlanRow(store);
  const limits = planRowToLimits(planRow);
  const aiGenerationsToday = effectiveAiDailyUsed(store);
  return {
    limits,
    aiGenerationsToday,
    planRow,
    planSlug: planRow.slug,
    planName: planRow.name,
    planId: planRow.id,
    planExpiresAt: store?.plan_expires_at ?? null,
    planAssignmentExpired: planExpired(store),
    verified: verifiedEffective(store),
    verifiedExpiresAt: store?.verified_expires_at ?? null,
  };
}

function addMonthsIso(fromDate, months) {
  const d = new Date(fromDate);
  d.setUTCMonth(d.getUTCMonth() + Number(months));
  return d.toISOString();
}

module.exports = {
  planExpired,
  verifiedEffective,
  planRowToLimits,
  effectiveAiDailyUsed,
  getEffectivePlanRow,
  getStorePlanSummary,
  addMonthsIso,
};
