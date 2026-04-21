const { z } = require("zod");
const { loadEnv } = require("../config/env");
const affiliateModel = require("../models/affiliate.model");
const referralModel = require("../models/affiliate-referral.model");
const commissionModel = require("../models/affiliate-commission.model");
const withdrawalModel = require("../models/affiliate-withdrawal.model");
const settingsModel = require("../models/affiliate-settings.model");
const storeModel = require("../models/store.model");
const subscriptionPlanModel = require("../models/subscription-plan.model");

async function overview(req, res) {
  try {
    const affiliateId = req.user.id;
    const { frontendUrl } = loadEnv();
    const base = String(frontendUrl || "").replace(/\/$/, "") || "https://laas24.com";
    const affiliate = await affiliateModel.findById(affiliateId);
    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate not found" });
    }
    const [
      referrals,
      commissions,
      settings,
      pendingWithdrawal,
    ] = await Promise.all([
      referralModel.listByAffiliateId(affiliateId, 500),
      commissionModel.listByAffiliate(affiliateId, 500),
      settingsModel.getSettings(),
      withdrawalModel.hasPendingForAffiliate(affiliateId),
    ]);

    const byStatus = (list, key) =>
      list.reduce((acc, row) => {
        const s = row[key];
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {});

    const totalEarnings = commissions.reduce(
      (s, c) => s + Number(c.amount || 0),
      0
    );
    const pendingEarnings = commissions
      .filter((c) => c.status === "pending")
      .reduce((s, c) => s + Number(c.amount || 0), 0);
    const withdrawable = commissions
      .filter((c) => c.status === "verified")
      .reduce((s, c) => s + Number(c.amount || 0), 0);
    const paidOut = commissions
      .filter((c) => c.status === "paid")
      .reduce((s, c) => s + Number(c.amount || 0), 0);

    res.json({
      affiliate,
      referral_url: `${base}/?ref=${encodeURIComponent(affiliate.ref_code)}`,
      stats: {
        total_referrals: referrals.length,
        referrals_by_status: byStatus(referrals, "status"),
        total_earnings: Math.round(totalEarnings * 100) / 100,
        pending_earnings: Math.round(pendingEarnings * 100) / 100,
        withdrawable: Math.round(withdrawable * 100) / 100,
        paid_out: Math.round(paidOut * 100) / 100,
        has_open_withdrawal: pendingWithdrawal,
        min_withdrawal: Number(settings.min_withdrawal ?? 0),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
}

async function referrals(req, res) {
  try {
    const affiliateId = req.user.id;
    const rows = await referralModel.listByAffiliateId(affiliateId, 200);
    const storeIds = rows.map((r) => r.store_id);
    const stores = await Promise.all(storeIds.map((id) => storeModel.findById(id)));
    const sm = Object.fromEntries(stores.filter(Boolean).map((s) => [s.id, s]));
    const planIds = [
      ...new Set(
        stores.filter(Boolean).map((s) => s.plan_id).filter(Boolean)
      ),
    ];
    const plans = await Promise.all(
      planIds.map((id) => subscriptionPlanModel.findById(id))
    );
    const pm = Object.fromEntries(plans.filter(Boolean).map((p) => [p.id, p]));
    const list = rows.map((r) => {
      const s = sm[r.store_id];
      const plan = s?.plan_id ? pm[s.plan_id] : null;
      return {
        ...r,
        store: s
          ? {
              id: s.id,
              store_name: s.store_name,
              slug: s.slug,
              plan_slug: plan?.slug ?? s.plan ?? null,
            }
          : null,
      };
    });
    res.json({ referrals: list });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
}

async function commissions(req, res) {
  try {
    const affiliateId = req.user.id;
    const rows = await commissionModel.listByAffiliate(affiliateId, 200);
    const storeIds = [...new Set(rows.map((r) => r.store_id))];
    const stores = await Promise.all(storeIds.map((id) => storeModel.findById(id)));
    const sm = Object.fromEntries(stores.filter(Boolean).map((s) => [s.id, s]));
    const planIds = [
      ...new Set(
        stores.filter(Boolean).map((s) => s.plan_id).filter(Boolean)
      ),
    ];
    const plans = await Promise.all(
      planIds.map((id) => subscriptionPlanModel.findById(id))
    );
    const pm = Object.fromEntries(plans.filter(Boolean).map((p) => [p.id, p]));
    const list = rows.map((c) => {
      const s = sm[c.store_id];
      const plan = s?.plan_id ? pm[s.plan_id] : null;
      return {
        ...c,
        store_name: s?.store_name ?? null,
        plan_name: plan?.name ?? plan?.slug ?? null,
      };
    });
    res.json({ commissions: list });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
}

const withdrawalSchema = z.object({
  method: z.enum(["evc_plus", "sahal", "whatsapp"]),
  phone: z.string().min(5).max(40),
});

async function requestWithdrawal(req, res) {
  try {
    const affiliateId = req.user.id;
    const parsed = withdrawalSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { method, phone } = parsed.data;

    const blocked = await withdrawalModel.hasPendingForAffiliate(affiliateId);
    if (blocked) {
      return res.status(409).json({
        error:
          "You already have a withdrawal in progress. Wait for admin to complete it.",
      });
    }

    const settings = await settingsModel.getSettings();
    const verified = await commissionModel.listVerifiedFifo(affiliateId);
    const amount = verified.reduce((s, c) => s + Number(c.amount || 0), 0);
    const rounded = Math.round(amount * 100) / 100;
    if (rounded < Number(settings.min_withdrawal)) {
      return res.status(400).json({
        error: `Minimum withdrawal is ${settings.min_withdrawal}. Current available: ${rounded}.`,
      });
    }
    if (!verified.length) {
      return res.status(400).json({ error: "No verified earnings to withdraw." });
    }

    const w = await withdrawalModel.createWithdrawal({
      affiliate_id: affiliateId,
      amount: rounded,
      status: "pending",
      method,
      phone: phone.trim(),
    });

    const ids = verified.map((c) => c.id);
    await commissionModel.updateManyByIds(ids, {
      status: "requested",
      withdrawal_id: w.id,
    });

    res.status(201).json({ withdrawal: w });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not create withdrawal" });
  }
}

async function withdrawals(req, res) {
  try {
    const list = await withdrawalModel.listByAffiliate(req.user.id, 100);
    res.json({ withdrawals: list });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
}

module.exports = {
  overview,
  referrals,
  commissions,
  requestWithdrawal,
  withdrawals,
};
