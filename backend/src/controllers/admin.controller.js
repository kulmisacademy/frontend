const { z } = require("zod");
const userModel = require("../models/user.model");
const storeModel = require("../models/store.model");
const productModel = require("../models/product.model");
const orderModel = require("../models/order.model");
const subscriptionRequestModel = require("../models/subscription-request.model");
const subscriptionPlanModel = require("../models/subscription-plan.model");
const { addMonthsIso } = require("../lib/store-effective-plan");

/**
 * Legacy `stores.plan` text was constrained to 'free' | 'premium'. Limits use `plan_id`;
 * for older DBs that still have stores_plan_check, map custom plan slugs to "premium".
 */
function legacyStoresPlanText(planRow) {
  const s = String(planRow?.slug || "")
    .trim()
    .toLowerCase();
  if (s === "free") return "free";
  return "premium";
}

function storeUpdateErrorResponse(e) {
  const code =
    e && typeof e === "object" && "code" in e ? String(e.code) : "";
  const message =
    e && typeof e === "object" && "message" in e && e.message != null
      ? String(e.message)
      : e instanceof Error
        ? e.message
        : String(e);
  const hint =
    e && typeof e === "object" && "hint" in e && e.hint != null
      ? String(e.hint)
      : undefined;
  const details =
    e && typeof e === "object" && "details" in e && e.details != null
      ? String(e.details)
      : undefined;
  const combined = [message, details, hint].filter(Boolean).join(" ");
  const isCheckViolation =
    code === "23514" ||
    /\b23514\b/.test(combined) ||
    /violates check constraint/i.test(combined) ||
    /stores_plan_check/i.test(combined);
  if (isCheckViolation) {
    return {
      status: 400,
      body: {
        error:
          "This database still restricts stores.plan to free/premium only. Run migration 012_stores_plan_slug_dynamic.sql (or full 006+) in Supabase, then retry.",
        code: code || "23514",
        message,
        hint,
        details,
      },
    };
  }
  const isFkViolation =
    code === "23503" || /\b23503\b/.test(combined) || /foreign key/i.test(combined);
  if (isFkViolation) {
    return {
      status: 400,
      body: {
        error: "Database rejected the update (invalid plan or reference).",
        code: code || "23503",
        message,
        hint,
        details,
      },
    };
  }
  return {
    status: 500,
    body: {
      error: "Could not update store",
      code: code || undefined,
      message,
      hint,
      details,
    },
  };
}

async function stats(req, res) {
  try {
    const [users, stores, products, orders] = await Promise.all([
      userModel.countRows(),
      storeModel.countRows(),
      productModel.countRows(),
      orderModel.countRows(),
    ]);
    res.json({
      stats: { users, stores, products, orders },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
}

async function users(req, res) {
  try {
    const users = await userModel.listAll(300);
    res.json({ users });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
}

async function stores(req, res) {
  try {
    const stores = await storeModel.listAll(300);
    const userIds = [...new Set(stores.map((s) => s.user_id).filter(Boolean))];
    const users = await userModel.findByIds(userIds);
    const byUser = Object.fromEntries(users.map((u) => [u.id, u]));
    const storeIds = stores.map((s) => s.id);
    const { products: productCounts, videos: videoCounts } =
      await productModel.aggregateCountsForStores(storeIds);
    const list = stores.map((s) => ({
      ...s,
      owner: byUser[s.user_id]
        ? {
            name: byUser[s.user_id].name,
            email: byUser[s.user_id].email,
            phone: byUser[s.user_id].phone,
          }
        : null,
      product_count: productCounts.get(s.id) ?? 0,
      video_count: videoCounts.get(s.id) ?? 0,
    }));
    res.json({ stores: list });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
}

/** GET /stores/:id — same shape as rows in GET /stores (owner + counts). */
async function storeById(req, res) {
  try {
    const { id } = req.params;
    const row = await storeModel.findById(id);
    if (!row) {
      return res.status(404).json({ error: "Store not found" });
    }
    const users = row.user_id
      ? await userModel.findByIds([row.user_id])
      : [];
    const owner = users[0];
    const { products: productCounts, videos: videoCounts } =
      await productModel.aggregateCountsForStores([row.id]);
    const store = {
      ...row,
      owner: owner
        ? {
            name: owner.name,
            email: owner.email,
            phone: owner.phone,
          }
        : null,
      product_count: productCounts.get(row.id) ?? 0,
      video_count: videoCounts.get(row.id) ?? 0,
    };
    res.json({ store });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
}

const patchStoreAdminSchema = z
  .object({
    plan: z.enum(["free", "premium"]).optional(),
    verified: z.boolean().optional(),
    assign_plan: z
      .object({
        plan_id: z.string().uuid(),
        duration_months: z.coerce.number().int().min(1).max(120),
      })
      .optional(),
    assign_verified: z
      .object({
        duration_months: z.union([
          z.literal(1),
          z.literal(3),
          z.literal(6),
          z.literal(12),
        ]),
      })
      .optional(),
    set_free: z.literal(true).optional(),
  })
  .refine(
    (d) => {
      const legacy = d.plan !== undefined || d.verified !== undefined;
      const ap = !!d.assign_plan;
      const av = !!d.assign_verified;
      const sf = d.set_free === true;
      return [legacy, ap, av, sf].filter(Boolean).length === 1;
    },
    { message: "Send one action: legacy plan/verified, assign_plan, assign_verified, or set_free" }
  );

/** Direct plan / verified update (no subscription request required). */
async function patchStore(req, res) {
  try {
    const { id } = req.params;
    const parsed = patchStoreAdminSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const data = parsed.data;
    const existing = await storeModel.findById(id);
    if (!existing) {
      return res.status(404).json({ error: "Store not found" });
    }
    const free = await subscriptionPlanModel.findBySlug("free");
    const premium = await subscriptionPlanModel.findBySlug("premium");
    if (!free) {
      return res.status(500).json({ error: "Missing Free plan in database" });
    }

    if (data.assign_plan) {
      const planRow = await subscriptionPlanModel.findById(
        data.assign_plan.plan_id
      );
      if (!planRow || planRow.active === false) {
        return res.status(400).json({ error: "Invalid or inactive plan" });
      }
      const updated = await storeModel.updateStore(id, {
        plan_id: planRow.id,
        plan: legacyStoresPlanText(planRow),
        plan_expires_at: addMonthsIso(
          new Date(),
          data.assign_plan.duration_months
        ),
      });
      return res.json({ store: updated });
    }

    if (data.assign_verified) {
      const updated = await storeModel.updateStore(id, {
        verified: true,
        verified_expires_at: addMonthsIso(
          new Date(),
          data.assign_verified.duration_months
        ),
      });
      return res.json({ store: updated });
    }

    if (data.set_free) {
      const updated = await storeModel.updateStore(id, {
        plan_id: free.id,
        plan: free.slug,
        plan_expires_at: null,
        verified: false,
        verified_expires_at: null,
      });
      return res.json({ store: updated });
    }

    const patch = {};
    if (data.plan === "premium") {
      if (!premium) {
        return res.status(400).json({
          error:
            "Premium plan is missing in the database. Run subscription plan migrations or seed subscription_plans.",
        });
      }
      patch.plan_id = premium.id;
      patch.plan = premium.slug;
      patch.plan_expires_at = null;
    } else if (data.plan === "free") {
      patch.plan_id = free.id;
      patch.plan = free.slug;
      patch.plan_expires_at = null;
    }
    if (data.verified !== undefined) patch.verified = data.verified;
    if (data.verified === false) patch.verified_expires_at = null;
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({
        error: "Nothing to update (invalid or empty legacy plan/verified payload).",
      });
    }
    const updated = await storeModel.updateStore(id, patch);
    res.json({ store: updated });
  } catch (e) {
    console.error(e);
    const { status, body } = storeUpdateErrorResponse(e);
    res.status(status).json(body);
  }
}

async function deleteStore(req, res) {
  try {
    const { id } = req.params;
    const existing = await storeModel.findById(id);
    if (!existing) {
      return res.status(404).json({ error: "Store not found" });
    }
    await storeModel.deleteById(id);
    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not delete store" });
  }
}

async function subscriptionRequests(req, res) {
  try {
    const rows = await subscriptionRequestModel.listAllForAdmin(300);
    const storeIds = [...new Set(rows.map((r) => r.store_id))];
    const planIds = [...new Set(rows.map((r) => r.target_plan_id).filter(Boolean))];
    const stores = await Promise.all(storeIds.map((id) => storeModel.findById(id)));
    const plans = await Promise.all(
      planIds.map((pid) => subscriptionPlanModel.findById(pid))
    );
    const byStore = Object.fromEntries(
      stores.filter(Boolean).map((s) => [s.id, s])
    );
    const byPlan = Object.fromEntries(
      plans.filter(Boolean).map((p) => [p.id, p])
    );
    const list = rows.map((r) => ({
      ...r,
      target_plan_name: r.target_plan_id
        ? byPlan[r.target_plan_id]?.name ?? null
        : null,
      store: byStore[r.store_id]
        ? {
            id: byStore[r.store_id].id,
            store_name: byStore[r.store_id].store_name,
            slug: byStore[r.store_id].slug,
          }
        : null,
    }));
    res.json({ requests: list });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
}

async function approveSubscriptionRequest(req, res) {
  try {
    const { id } = req.params;
    const row = await subscriptionRequestModel.findById(id);
    if (!row) return res.status(404).json({ error: "Request not found" });
    if (row.status !== "pending") {
      return res.status(409).json({ error: "Request is no longer pending" });
    }
    const requestType = row.request_type || "plan";
    const months = Math.max(1, Number(row.duration_months) || 1);
    if (requestType === "verified") {
      await storeModel.updateStore(row.store_id, {
        verified: true,
        verified_expires_at: addMonthsIso(new Date(), months),
      });
    } else {
      const planRow = row.target_plan_id
        ? await subscriptionPlanModel.findById(row.target_plan_id)
        : null;
      if (!planRow || planRow.active === false) {
        return res.status(400).json({ error: "Invalid plan on this request" });
      }
      await storeModel.updateStore(row.store_id, {
        plan_id: planRow.id,
        plan: planRow.slug,
        plan_expires_at: addMonthsIso(new Date(), months),
      });
    }
    const updated = await subscriptionRequestModel.resolveRequest(
      id,
      "approved",
      req.user.id
    );
    if (!updated) {
      return res.status(409).json({ error: "Could not approve request" });
    }
    res.json({ request: updated, store_id: row.store_id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not approve request" });
  }
}

async function rejectSubscriptionRequest(req, res) {
  try {
    const { id } = req.params;
    const row = await subscriptionRequestModel.findById(id);
    if (!row) return res.status(404).json({ error: "Request not found" });
    if (row.status !== "pending") {
      return res.status(409).json({ error: "Request is no longer pending" });
    }
    const updated = await subscriptionRequestModel.resolveRequest(
      id,
      "rejected",
      req.user.id
    );
    if (!updated) {
      return res.status(409).json({ error: "Could not reject request" });
    }
    res.json({ request: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not reject request" });
  }
}

async function products(req, res) {
  try {
    const products = await productModel.listAll(300);
    const stores = await storeModel.listAll(500);
    const sm = Object.fromEntries(stores.map((s) => [s.id, s]));
    const list = products.map((p) => ({
      ...p,
      store_name: sm[p.store_id]?.store_name ?? null,
      store_slug: sm[p.store_id]?.slug ?? null,
    }));
    res.json({ products: list });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
}

function looksLikeUuid(s) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s
  );
}

async function orders(req, res) {
  try {
    const q = req.query || {};
    const datePreset = typeof q.date === "string" ? q.date : "all";
    const status = typeof q.status === "string" ? q.status : "all";
    const limitRaw = q.limit != null ? parseInt(String(q.limit), 10) : 300;
    let storeId =
      typeof q.store_id === "string" && q.store_id.trim()
        ? q.store_id.trim()
        : null;
    if (storeId && !looksLikeUuid(storeId)) {
      storeId = null;
    }
    const raw = await orderModel.listFiltered({
      storeId,
      datePreset,
      status,
      limit: limitRaw,
    });
    const orders = await orderModel.enrichOrdersWithStores(raw);
    res.json({ orders });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
}

async function listPlans(req, res) {
  try {
    const plans = await subscriptionPlanModel.listAll();
    res.json({ plans });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
}

const createPlanSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(80).optional(),
  price: z.coerce.number().min(0).max(99_999_999).optional(),
  product_limit: z.coerce.number().int().min(0),
  video_limit: z.coerce.number().int().min(0),
  ai_limit: z
    .union([z.coerce.number().int().min(0), z.literal(-1)])
    .optional(),
  /** Per UTC day; omit or -1 for no daily cap (then ai_limit is lifetime total). */
  ai_daily_limit: z
    .union([z.coerce.number().int().min(0), z.literal(-1)])
    .optional(),
  sort_order: z.coerce.number().int().optional(),
  active: z.boolean().optional(),
});

async function createPlan(req, res) {
  try {
    const parsed = createPlanSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const d = parsed.data;
    const plan = await subscriptionPlanModel.createPlan({
      name: d.name,
      slug: d.slug,
      price: d.price ?? 0,
      productLimit: d.product_limit,
      videoLimit: d.video_limit,
      aiLimit: d.ai_limit === -1 ? null : d.ai_limit,
      aiDailyLimit: d.ai_daily_limit,
      sortOrder: d.sort_order,
      active: d.active,
    });
    res.status(201).json({ plan });
  } catch (e) {
    console.error(e);
    if (e.code === "23505") {
      return res.status(409).json({ error: "Slug already exists" });
    }
    res.status(500).json({ error: "Could not create plan" });
  }
}

const updatePlanSchema = createPlanSchema.partial();

async function updatePlan(req, res) {
  try {
    const { id } = req.params;
    const parsed = updatePlanSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const d = parsed.data;
    const patch = {};
    if (d.name !== undefined) patch.name = d.name;
    if (d.slug !== undefined) patch.slug = d.slug;
    if (d.product_limit !== undefined) patch.product_limit = d.product_limit;
    if (d.video_limit !== undefined) patch.video_limit = d.video_limit;
    if (d.ai_limit !== undefined) {
      patch.ai_limit = d.ai_limit === -1 ? null : d.ai_limit;
    }
    if (d.ai_daily_limit !== undefined) {
      patch.ai_daily_limit = d.ai_daily_limit === -1 ? null : d.ai_daily_limit;
    }
    if (d.price !== undefined) patch.price = d.price;
    if (d.sort_order !== undefined) patch.sort_order = d.sort_order;
    if (d.active !== undefined) patch.active = d.active;
    const plan = await subscriptionPlanModel.updatePlan(id, patch);
    if (!plan) return res.status(404).json({ error: "Plan not found" });
    res.json({ plan });
  } catch (e) {
    console.error(e);
    if (e.code === "SYSTEM_PLAN") {
      return res.status(400).json({ error: e.message });
    }
    res.status(500).json({ error: "Could not update plan" });
  }
}

async function deletePlan(req, res) {
  try {
    const { id } = req.params;
    const deleted = await subscriptionPlanModel.deletePlan(id);
    if (!deleted) return res.status(404).json({ error: "Plan not found" });
    res.status(204).send();
  } catch (e) {
    console.error(e);
    if (e.code === "SYSTEM_PLAN") {
      return res.status(400).json({ error: e.message });
    }
    if (e.code === "23503") {
      return res.status(409).json({
        error: "Plan is still assigned to stores or requests",
      });
    }
    res.status(500).json({ error: "Could not delete plan" });
  }
}

module.exports = {
  stats,
  users,
  stores,
  storeById,
  patchStore,
  deleteStore,
  subscriptionRequests,
  approveSubscriptionRequest,
  rejectSubscriptionRequest,
  products,
  orders,
  listPlans,
  createPlan,
  updatePlan,
  deletePlan,
};
