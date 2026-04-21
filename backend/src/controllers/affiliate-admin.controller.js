const { z } = require("zod");
const affiliateModel = require("../models/affiliate.model");
const referralModel = require("../models/affiliate-referral.model");
const commissionModel = require("../models/affiliate-commission.model");
const withdrawalModel = require("../models/affiliate-withdrawal.model");
const settingsModel = require("../models/affiliate-settings.model");
const storeModel = require("../models/store.model");

const patchSettingsSchema = z.object({
  commission_type: z.enum(["percent", "fixed"]).optional(),
  commission_value: z.coerce.number().min(0).optional(),
  min_withdrawal: z.coerce.number().min(0).optional(),
  first_n_bonus_stores: z.coerce.number().int().min(0).max(1000).optional(),
  first_n_bonus_extra_percent: z.coerce.number().min(0).optional(),
});

const bonusSchema = z.object({
  amount: z.coerce.number().positive().max(99_999_999),
  notes: z.string().max(500).optional().nullable(),
});

const rejectReferralSchema = z.object({
  rejection_reason: z.string().min(1).max(500),
});

async function listAffiliates(req, res) {
  try {
    const affiliates = await affiliateModel.listAll(400);
    const enriched = await Promise.all(
      affiliates.map(async (a) => {
        const referrals = await referralModel.listByAffiliateId(a.id, 500);
        const commissions = await commissionModel.listByAffiliate(a.id, 500);
        const earned = commissions
          .filter((c) =>
            ["verified", "requested", "approved", "paid"].includes(c.status)
          )
          .reduce((s, c) => s + Number(c.amount || 0), 0);
        return {
          ...a,
          referral_count: referrals.length,
          verified_referrals: referrals.filter((r) => r.status === "verified")
            .length,
          total_commission_amount: Math.round(earned * 100) / 100,
        };
      })
    );
    res.json({ affiliates: enriched });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
}

async function listReferredStores(req, res) {
  try {
    const affiliateId =
      typeof req.query.affiliate_id === "string" ? req.query.affiliate_id : "";
    if (!affiliateId) {
      return res.status(400).json({ error: "affiliate_id query required" });
    }
    const referrals = await referralModel.listByAffiliateId(affiliateId, 300);
    const storeIds = referrals.map((r) => r.store_id);
    const stores = await Promise.all(storeIds.map((id) => storeModel.findById(id)));
    const sm = Object.fromEntries(stores.filter(Boolean).map((s) => [s.id, s]));
    const list = referrals.map((r) => ({
      ...r,
      store: sm[r.store_id] ?? null,
    }));
    res.json({ referrals: list });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
}

async function getAffiliateSettings(req, res) {
  try {
    const settings = await settingsModel.getSettings();
    res.json({ settings });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
}

async function patchAffiliateSettings(req, res) {
  try {
    const parsed = patchSettingsSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const patch = {};
    const d = parsed.data;
    if (d.commission_type !== undefined) patch.commission_type = d.commission_type;
    if (d.commission_value !== undefined) patch.commission_value = d.commission_value;
    if (d.min_withdrawal !== undefined) patch.min_withdrawal = d.min_withdrawal;
    if (d.first_n_bonus_stores !== undefined) {
      patch.first_n_bonus_stores = d.first_n_bonus_stores;
    }
    if (d.first_n_bonus_extra_percent !== undefined) {
      patch.first_n_bonus_extra_percent = d.first_n_bonus_extra_percent;
    }
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }
    const settings = await settingsModel.updateSettings(patch);
    res.json({ settings });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not update settings" });
  }
}

async function listWithdrawals(req, res) {
  try {
    const status =
      typeof req.query.status === "string" ? req.query.status : "all";
    const rows = await withdrawalModel.listAllForAdmin(status, 300);
    const affiliateIds = [...new Set(rows.map((w) => w.affiliate_id))];
    const affiliates = await Promise.all(
      affiliateIds.map((id) => affiliateModel.findById(id))
    );
    const am = Object.fromEntries(affiliates.filter(Boolean).map((a) => [a.id, a]));
    const list = rows.map((w) => ({
      ...w,
      affiliate: am[w.affiliate_id]
        ? {
            id: am[w.affiliate_id].id,
            name: am[w.affiliate_id].name,
            email: am[w.affiliate_id].email,
            ref_code: am[w.affiliate_id].ref_code,
          }
        : null,
    }));
    res.json({ withdrawals: list });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
}

async function approveWithdrawal(req, res) {
  try {
    const { id } = req.params;
    const row = await withdrawalModel.findById(id);
    if (!row) return res.status(404).json({ error: "Withdrawal not found" });
    if (row.status !== "pending") {
      return res.status(409).json({ error: "Withdrawal is not pending" });
    }
    const linked = await commissionModel.listByWithdrawalId(id);
    for (const c of linked) {
      if (c.status === "requested") {
        await commissionModel.updateById(c.id, { status: "approved" });
      }
    }
    const updated = await withdrawalModel.updateWithdrawal(id, {
      status: "approved",
      resolved_at: new Date().toISOString(),
    });
    res.json({ withdrawal: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not approve" });
  }
}

async function rejectWithdrawal(req, res) {
  try {
    const { id } = req.params;
    const parsed = z
      .object({ admin_note: z.string().max(500).optional().nullable() })
      .safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const row = await withdrawalModel.findById(id);
    if (!row) return res.status(404).json({ error: "Withdrawal not found" });
    if (row.status !== "pending") {
      return res.status(409).json({ error: "Withdrawal is not pending" });
    }
    const linked = await commissionModel.listByWithdrawalId(id);
    for (const c of linked) {
      if (c.status === "requested") {
        await commissionModel.updateById(c.id, {
          status: "verified",
          withdrawal_id: null,
        });
      }
    }
    const updated = await withdrawalModel.updateWithdrawal(id, {
      status: "rejected",
      admin_note: parsed.data.admin_note ?? null,
      resolved_at: new Date().toISOString(),
    });
    res.json({ withdrawal: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not reject" });
  }
}

async function markWithdrawalPaid(req, res) {
  try {
    const { id } = req.params;
    const row = await withdrawalModel.findById(id);
    if (!row) return res.status(404).json({ error: "Withdrawal not found" });
    if (row.status !== "approved") {
      return res.status(409).json({ error: "Withdrawal must be approved first" });
    }
    const linked = await commissionModel.listByWithdrawalId(id);
    for (const c of linked) {
      if (c.status === "approved") {
        await commissionModel.updateById(c.id, {
          status: "paid",
          withdrawal_id: id,
        });
      }
    }
    const updated = await withdrawalModel.updateWithdrawal(id, {
      status: "paid",
      resolved_at: new Date().toISOString(),
    });
    res.json({ withdrawal: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not mark paid" });
  }
}

async function manualBonus(req, res) {
  try {
    const { id } = req.params;
    const parsed = bonusSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const aff = await affiliateModel.findById(id);
    if (!aff) return res.status(404).json({ error: "Affiliate not found" });
    const { amount, notes } = parsed.data;
    const row = await commissionModel.insertCommission({
      affiliate_id: id,
      store_id: null,
      subscription_request_id: null,
      plan_slug: null,
      plan_price: null,
      amount: Math.round(amount * 100) / 100,
      status: "verified",
      withdrawal_id: null,
      source: "manual_bonus",
      notes: notes ?? null,
    });
    res.status(201).json({ commission: row });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not add bonus" });
  }
}

async function rejectReferral(req, res) {
  try {
    const { id } = req.params;
    const parsed = rejectReferralSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const ref = await referralModel.findById(id);
    if (!ref) return res.status(404).json({ error: "Referral not found" });
    if (ref.status === "rejected") {
      return res.json({ referral: ref });
    }
    if (ref.status !== "pending") {
      return res.status(400).json({
        error:
          "Only pending referrals can be rejected. Verified stores with earnings must be handled separately.",
      });
    }
    const updated = await referralModel.updateReferral(id, {
      status: "rejected",
      rejection_reason: parsed.data.rejection_reason,
      verified_at: null,
    });
    await commissionModel.deletePendingForStore(ref.store_id);
    res.json({ referral: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not reject referral" });
  }
}

module.exports = {
  listAffiliates,
  listReferredStores,
  getAffiliateSettings,
  patchAffiliateSettings,
  listWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  markWithdrawalPaid,
  manualBonus,
  rejectReferral,
};
