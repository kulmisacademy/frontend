const storeModel = require("../models/store.model");
const referralModel = require("../models/affiliate-referral.model");
const commissionModel = require("../models/affiliate-commission.model");
const settingsModel = require("../models/affiliate-settings.model");
const {
  computeCommissionAmount,
} = require("./affiliate-qualification");

/**
 * When admin approves a paid-plan subscription request, create a commission row
 * (pending until the referred store qualifies).
 */
async function createCommissionForApprovedPlanRequest({
  subscriptionRequestId,
  storeId,
  planRow,
}) {
  if (!subscriptionRequestId || !storeId || !planRow) return null;
  const slug = String(planRow.slug || "").toLowerCase();
  const planPrice = Number(planRow.price ?? 0);
  if (slug === "free" || planPrice <= 0) return null;
  const existing = await commissionModel.findBySubscriptionRequestId(
    subscriptionRequestId
  );
  if (existing) return existing;

  const store = await storeModel.findById(storeId);
  if (!store || !store.referred_by_affiliate_id) return null;

  let referral = await referralModel.findByStoreId(storeId);
  if (!referral) {
    referral = await referralModel.createReferral({
      affiliateId: store.referred_by_affiliate_id,
      storeId,
      status: "pending",
    });
  }
  if (referral.status === "rejected") return null;

  const settings = await settingsModel.getSettings();
  const amount = await computeCommissionAmount({
    planPrice,
    affiliateId: store.referred_by_affiliate_id,
    storeId,
    settings,
  });

  const initialStatus = referral.status === "verified" ? "verified" : "pending";

  return commissionModel.insertCommission({
    affiliate_id: store.referred_by_affiliate_id,
    store_id: storeId,
    subscription_request_id: subscriptionRequestId,
    plan_slug: planRow.slug ?? null,
    plan_price: planPrice,
    amount,
    status: initialStatus,
    source: "subscription",
    notes: null,
  });
}

module.exports = {
  createCommissionForApprovedPlanRequest,
};
