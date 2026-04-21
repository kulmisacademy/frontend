const storeModel = require("../models/store.model");
const productModel = require("../models/product.model");
const orderModel = require("../models/order.model");
const referralModel = require("../models/affiliate-referral.model");
const commissionModel = require("../models/affiliate-commission.model");
const settingsModel = require("../models/affiliate-settings.model");

function nonEmpty(s) {
  return typeof s === "string" && s.trim().length > 0;
}

/**
 * Store meets PRD rules: logo + banner + ≥10 products + ≥1 approved order.
 */
async function storeMeetsReferralRules(store) {
  if (!store) return false;
  const [productCount, approvedOrders] = await Promise.all([
    productModel.countByStoreId(store.id),
    orderModel.approvedCountByStoreId(store.id),
  ]);
  return (
    nonEmpty(store.logo) &&
    nonEmpty(store.banner_url) &&
    productCount >= 10 &&
    approvedOrders >= 1
  );
}

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

async function verificationRank(affiliateId, storeId) {
  const mine = await referralModel.findByStoreId(storeId);
  if (!mine || mine.status !== "verified" || !mine.verified_at) return null;
  const { getSupabase } = require("../lib/supabase");
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("affiliate_referrals")
    .select("verified_at, id")
    .eq("affiliate_id", affiliateId)
    .eq("status", "verified");
  if (error) throw error;
  const rows = (data || []).filter((r) => r.verified_at);
  const tMine = new Date(mine.verified_at).getTime();
  const before = rows.filter((r) => {
    const t = new Date(r.verified_at).getTime();
    return t < tMine || (t === tMine && String(r.id) < String(mine.id));
  });
  return before.length + 1;
}

async function computeCommissionAmount({
  planPrice,
  affiliateId,
  storeId,
  settings,
}) {
  const price = Number(planPrice || 0);
  const base =
    settings.commission_type === "percent"
      ? price * (Number(settings.commission_value) / 100)
      : Number(settings.commission_value);
  let mult = 1;
  const rank = await verificationRank(affiliateId, storeId);
  if (
    rank != null &&
    rank <= Number(settings.first_n_bonus_stores || 0) &&
    Number(settings.first_n_bonus_extra_percent) > 0
  ) {
    mult += Number(settings.first_n_bonus_extra_percent) / 100;
  }
  return roundMoney(Math.max(0, base * mult));
}

async function promotePendingCommissionsForStore(storeId) {
  const pending = await commissionModel.listPendingByStoreId(storeId);
  if (!pending.length) return;
  const settings = await settingsModel.getSettings();
  for (const row of pending) {
    const amount = await computeCommissionAmount({
      planPrice: row.plan_price,
      affiliateId: row.affiliate_id,
      storeId,
      settings,
    });
    await commissionModel.updateById(row.id, {
      amount,
      status: "verified",
    });
  }
}

/**
 * Updates referral + unlocks pending commissions when rules pass.
 */
async function syncReferralQualificationForStore(storeId) {
  const store = await storeModel.findById(storeId);
  if (!store || !store.referred_by_affiliate_id) return { updated: false };

  let referral = await referralModel.findByStoreId(storeId);
  if (!referral) {
    referral = await referralModel.createReferral({
      affiliateId: store.referred_by_affiliate_id,
      storeId,
      status: "pending",
    });
  }
  if (referral.status === "rejected") return { updated: false };

  const ok = await storeMeetsReferralRules(store);
  if (ok && referral.status === "pending") {
    await referralModel.updateReferral(referral.id, {
      status: "verified",
      verified_at: new Date().toISOString(),
    });
    await promotePendingCommissionsForStore(storeId);
    return { updated: true, verified: true };
  }
  return { updated: false, verified: referral.status === "verified" };
}

module.exports = {
  storeMeetsReferralRules,
  syncReferralQualificationForStore,
  computeCommissionAmount,
  promotePendingCommissionsForStore,
};
