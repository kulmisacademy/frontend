const { z } = require("zod");
const storeModel = require("../models/store.model");
const productModel = require("../models/product.model");
const orderModel = require("../models/order.model");
const subscriptionRequestModel = require("../models/subscription-request.model");
const { getSupabase } = require("../lib/supabase");
const { loadEnv } = require("../config/env");
const {
  getEffectivePlanRow,
  planRowToLimits,
  getStorePlanSummary,
  planExpired,
  verifiedEffective,
} = require("../lib/store-effective-plan");
const subscriptionPlanModel = require("../models/subscription-plan.model");
const { slugify } = require("../lib/slug");
const {
  isValidRegionCapital,
  capitalForRegion,
} = require("../lib/somalia");
const { withNetworkRetries } = require("../lib/retry-network");

async function getStoreForVendor(userId) {
  return storeModel.findByUserId(userId);
}

async function overview(req, res) {
  try {
    const store = await getStoreForVendor(req.user.id);
    if (!store) return res.status(404).json({ error: "No store for this account" });
    const summary = await getStorePlanSummary(store);
    const { limits } = summary;
    const [productCount, orderCount, pendingOrders, videoCount] =
      await Promise.all([
        productModel.countByStoreId(store.id),
        orderModel.countByStoreId(store.id),
        orderModel.pendingCountByStoreId(store.id),
        productModel.countVideosByStoreId(store.id),
      ]);
    res.json({
      store,
      stats: {
        productCount,
        orderCount,
        pendingOrders,
        revenue: null,
      },
      plan: {
        limits: {
          maxProducts: limits.maxProducts,
          maxVideos: limits.maxVideos,
          maxAiDaily:
            limits.maxAiDaily != null && Number.isFinite(limits.maxAiDaily)
              ? limits.maxAiDaily
              : null,
          maxAiGenerations:
            limits.maxAiGenerations === Infinity || limits.maxAiGenerations == null
              ? null
              : limits.maxAiGenerations,
        },
        usage: {
          products: productCount,
          videos: videoCount,
          aiGenerations: store.ai_generations_used ?? 0,
          aiGenerationsToday: summary.aiGenerationsToday ?? 0,
        },
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
}

async function getMyStore(req, res) {
  try {
    const store = await getStoreForVendor(req.user.id);
    if (!store) return res.status(404).json({ error: "No store" });
    res.json({ store });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
}

const patchStoreSchema = z.object({
  store_name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  whatsapp_phone: z.string().max(40).optional().nullable(),
  country: z.string().max(120).optional(),
  region: z.string().max(120).optional(),
  city: z.string().max(120).optional(),
});

async function uploadToStoreBucket(userId, folder, file) {
  const { storageBucket } = loadEnv();
  const supabase = getSupabase();
  const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/${folder}/${Date.now()}-${safeName}`;
  await withNetworkRetries(async () => {
    const { error } = await supabase.storage
      .from(storageBucket)
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });
    if (error) throw error;
  });
  const {
    data: { publicUrl },
  } = supabase.storage.from(storageBucket).getPublicUrl(path);
  return publicUrl;
}

async function updateMyStore(req, res) {
  try {
    const store = await getStoreForVendor(req.user.id);
    if (!store) return res.status(404).json({ error: "No store" });

    const parsed = patchStoreSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const d = parsed.data;
    const patch = {};

    if (d.store_name != null && d.store_name !== "") {
      patch.store_name = d.store_name.trim();
      const base = slugify(patch.store_name);
      patch.slug = await storeModel.ensureUniqueSlug(base, store.id);
    }
    if (d.description !== undefined) patch.description = d.description;
    if (d.whatsapp_phone !== undefined) patch.whatsapp_phone = d.whatsapp_phone;

    if (d.country != null || d.region != null || d.city != null) {
      const loc = { ...(store.location || {}) };
      if (d.country !== undefined && d.country !== null) loc.country = d.country;
      if (d.region !== undefined && d.region !== null) {
        loc.region = d.region;
        loc.city = d.city || capitalForRegion(d.region) || loc.city;
      } else if (d.city !== undefined && d.city !== null) {
        loc.city = d.city;
      }
      if (
        loc.region &&
        loc.city &&
        !isValidRegionCapital(loc.region, loc.city)
      ) {
        return res
          .status(400)
          .json({ error: "Invalid region and capital pair" });
      }
      patch.location = loc;
    }

    const logoFile = req.files?.logo?.[0];
    const bannerFile = req.files?.banner?.[0];
    if (logoFile) {
      patch.logo = await uploadToStoreBucket(req.user.id, "logo", logoFile);
    }
    if (bannerFile) {
      patch.banner_url = await uploadToStoreBucket(
        req.user.id,
        "banner",
        bannerFile
      );
    }

    if (
      Object.keys(patch).length === 0 &&
      !logoFile &&
      !bannerFile
    ) {
      return res.json({ store });
    }

    const updated = await storeModel.updateStore(store.id, patch);
    res.json({ store: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not update store" });
  }
}

async function patchMyStoreJson(req, res) {
  return updateMyStore(req, res);
}

async function listProducts(req, res) {
  try {
    const store = await getStoreForVendor(req.user.id);
    if (!store) return res.status(404).json({ error: "No store" });
    const products = await productModel.listByStoreId(store.id);
    res.json({ products });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
}

async function getProduct(req, res) {
  try {
    const store = await getStoreForVendor(req.user.id);
    if (!store) return res.status(404).json({ error: "No store" });
    const { id } = req.params;
    const product = await productModel.findById(id);
    if (!product || product.store_id !== store.id) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json({ product });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
}

function parseFeaturesJson(raw) {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const j = JSON.parse(raw);
    return Array.isArray(j) ? j.map(String).filter(Boolean).slice(0, 30) : [];
  } catch {
    return [];
  }
}

const productBodySchema = z.object({
  name: z.string().min(1).max(300),
  description: z.string().max(8000).optional().nullable(),
  price: z.coerce.number().nonnegative(),
  old_price: z.coerce.number().nonnegative().optional().nullable(),
  category: z.string().max(120).optional(),
  video_url: z.union([z.string().url(), z.literal("")]).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  in_stock: z
    .preprocess((v) => {
      if (v === undefined || v === null) return undefined;
      if (v === false || v === "false" || v === "0") return false;
      return true;
    }, z.boolean().optional()),
});

async function createProduct(req, res) {
  try {
    const store = await getStoreForVendor(req.user.id);
    if (!store) return res.status(404).json({ error: "No store" });
    const limits = planRowToLimits(await getEffectivePlanRow(store));
    const productCount = await productModel.countByStoreId(store.id);
    if (productCount >= limits.maxProducts) {
      return res.status(403).json({
        error: "You have reached your plan limit. Upgrade to continue.",
        code: "PLAN_LIMIT_PRODUCTS",
      });
    }
    const raw = {
      ...req.body,
      in_stock:
        req.body.in_stock === "true" ||
        req.body.in_stock === true ||
        req.body.in_stock === "1",
    };
    const parsed = productBodySchema.safeParse(raw);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const imageFiles = Array.isArray(req.files?.images)
      ? req.files.images
      : req.files?.images
        ? [req.files.images]
        : [];
    const videoFile = req.files?.video?.[0];
    const urls = [];
    for (const f of imageFiles.slice(0, 5)) {
      urls.push(await uploadToStoreBucket(req.user.id, "products", f));
    }
    if (urls.length === 0) {
      return res.status(400).json({ error: "At least one product image is required" });
    }
    let videoUrl = null;
    if (videoFile) {
      videoUrl = await uploadToStoreBucket(
        req.user.id,
        "products-video",
        videoFile
      );
    } else if (parsed.data.video_url && parsed.data.video_url !== "") {
      videoUrl = parsed.data.video_url;
    }
    if (videoUrl) {
      const videoCount = await productModel.countVideosByStoreId(store.id);
      if (videoCount >= limits.maxVideos) {
        return res.status(403).json({
          error:
            "You have reached the video limit for your plan. Upgrade to continue.",
          code: "PLAN_LIMIT_VIDEOS",
        });
      }
    }
    const features = parseFeaturesJson(req.body.features);
    const row = {
      store_id: store.id,
      name: parsed.data.name.trim(),
      description: parsed.data.description ?? null,
      price: parsed.data.price,
      old_price: parsed.data.old_price ?? null,
      category: parsed.data.category?.trim() || "General",
      images: urls,
      video_url: videoUrl,
      in_stock: parsed.data.in_stock !== false,
      features,
      location: parsed.data.location?.trim() || null,
    };
    const product = await productModel.createProduct(row);
    res.status(201).json({ product });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not create product" });
  }
}

async function updateProduct(req, res) {
  try {
    const store = await getStoreForVendor(req.user.id);
    if (!store) return res.status(404).json({ error: "No store" });
    const { id } = req.params;
    const existing = await productModel.findById(id);
    if (!existing || existing.store_id !== store.id) {
      return res.status(404).json({ error: "Product not found" });
    }
    const parsed = productBodySchema.partial().safeParse({
      ...req.body,
      in_stock:
        req.body.in_stock === "true" ||
        req.body.in_stock === true ||
        req.body.in_stock === "1" ||
        req.body.in_stock === false,
    });
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const patch = {};
    for (const [k, v] of Object.entries(parsed.data)) {
      if (v !== undefined) patch[k] = v;
    }
    if (patch.name) patch.name = patch.name.trim();
    if (patch.category) patch.category = patch.category.trim();
    if (patch.video_url === "") patch.video_url = null;
    if (patch.location === "") patch.location = null;

    const imageFiles = Array.isArray(req.files?.images)
      ? req.files.images
      : req.files?.images
        ? [req.files.images]
        : [];
    if (imageFiles.length > 0) {
      const urls = [];
      for (const f of imageFiles.slice(0, 5)) {
        urls.push(await uploadToStoreBucket(req.user.id, "products", f));
      }
      patch.images = urls;
    }

    const videoFile = req.files?.video?.[0];
    if (videoFile) {
      patch.video_url = await uploadToStoreBucket(
        req.user.id,
        "products-video",
        videoFile
      );
    }

    if (typeof req.body.features === "string") {
      patch.features = parseFeaturesJson(req.body.features);
    }

    const limits = planRowToLimits(await getEffectivePlanRow(store));
    const hadVideo =
      !!existing.video_url && String(existing.video_url).trim().length > 0;
    let nextHasVideo = hadVideo;
    if (patch.video_url !== undefined) {
      nextHasVideo =
        !!patch.video_url && String(patch.video_url).trim().length > 0;
    } else if (videoFile) {
      nextHasVideo = true;
    }
    if (!hadVideo && nextHasVideo) {
      const videoCount = await productModel.countVideosByStoreId(store.id);
      if (videoCount >= limits.maxVideos) {
        return res.status(403).json({
          error:
            "You have reached the video limit for your plan. Upgrade to continue.",
          code: "PLAN_LIMIT_VIDEOS",
        });
      }
    }

    const product = await productModel.updateProduct(id, patch);
    res.json({ product });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not update product" });
  }
}

async function deleteProduct(req, res) {
  try {
    const store = await getStoreForVendor(req.user.id);
    if (!store) return res.status(404).json({ error: "No store" });
    const { id } = req.params;
    const existing = await productModel.findById(id);
    if (!existing || existing.store_id !== store.id) {
      return res.status(404).json({ error: "Product not found" });
    }
    await productModel.deleteProduct(id);
    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not delete product" });
  }
}

async function listOrders(req, res) {
  try {
    const store = await getStoreForVendor(req.user.id);
    if (!store) return res.status(404).json({ error: "No store" });
    const raw = await orderModel.listByStoreId(store.id);
    const orders = await orderModel.enrichOrdersWithStoresAndProducts(raw);
    res.json({ orders });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
}

async function patchOrder(req, res) {
  try {
    const store = await getStoreForVendor(req.user.id);
    if (!store) return res.status(404).json({ error: "No store" });
    const { id } = req.params;
    const schema = z.object({
      status: z.enum(["pending", "approved", "rejected"]),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const order = await orderModel.findById(id);
    if (!order || order.store_id !== store.id) {
      return res.status(404).json({ error: "Order not found" });
    }
    const updated = await orderModel.updateStatus(id, parsed.data.status);
    res.json({ order: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not update order" });
  }
}

const subscriptionRequestSchema = z
  .object({
    request_type: z.enum(["plan", "verified"]).optional(),
    target_plan_id: z.string().uuid().optional(),
    duration_months: z.coerce.number().int().min(1).max(120).optional(),
    contact_phone: z.string().min(5).max(40),
    notes: z.string().max(2000).optional().nullable(),
    plan_requested: z.enum(["premium"]).optional(),
  })
  .superRefine((data, ctx) => {
    const rt = data.request_type || (data.plan_requested ? "plan" : undefined);
    if (!rt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide request_type (plan|verified) or legacy plan_requested",
        path: ["request_type"],
      });
      return;
    }
    if (rt === "verified") {
      const dm = data.duration_months ?? 1;
      if (![1, 3, 6, 12].includes(dm)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Verified requests: duration_months must be 1, 3, 6, or 12",
          path: ["duration_months"],
        });
      }
    }
  });

async function getPlanUsage(req, res) {
  try {
    const store = await getStoreForVendor(req.user.id);
    if (!store) return res.status(404).json({ error: "No store" });
    const summary = await getStorePlanSummary(store);
    const { limits } = summary;
    const [productCount, videoCount] = await Promise.all([
      productModel.countByStoreId(store.id),
      productModel.countVideosByStoreId(store.id),
    ]);
    const aiUsedLifetime = store.ai_generations_used ?? 0;
    const aiToday = summary.aiGenerationsToday ?? 0;
    res.json({
      store: {
        id: store.id,
        store_name: store.store_name,
        plan: summary.planSlug,
        planName: summary.planName,
        planId: summary.planRow.id,
        planExpiresAt: summary.planExpiresAt,
        planAssignmentExpired: summary.planAssignmentExpired,
        planPrice: Number(summary.planRow?.price ?? 0),
        verified: summary.verified,
        verifiedExpiresAt: summary.verifiedExpiresAt,
      },
      limits: {
        maxProducts: limits.maxProducts,
        maxVideos: limits.maxVideos,
        maxAiDaily:
          limits.maxAiDaily != null && Number.isFinite(limits.maxAiDaily)
            ? limits.maxAiDaily
            : null,
        maxAiGenerations:
          limits.maxAiGenerations === Infinity || limits.maxAiGenerations == null
            ? null
            : limits.maxAiGenerations,
      },
      usage: {
        products: productCount,
        videos: videoCount,
        aiGenerations: aiUsedLifetime,
        aiGenerationsToday: aiToday,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
}

async function listPlanCatalog(req, res) {
  try {
    const plans = await subscriptionPlanModel.listUpgradeCatalog();
    const shaped = plans.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: Number(p.price ?? 0),
      productLimit: p.product_limit,
      videoLimit: p.video_limit,
      aiDailyLimit:
        p.ai_daily_limit != null && Number.isFinite(Number(p.ai_daily_limit))
          ? Number(p.ai_daily_limit)
          : null,
      aiUnlimited: p.ai_limit == null && p.ai_daily_limit == null,
      aiLimit: p.ai_limit,
    }));
    res.json({ plans: shaped });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
}

async function createSubscriptionRequest(req, res) {
  try {
    const store = await getStoreForVendor(req.user.id);
    if (!store) return res.status(404).json({ error: "No store" });
    const body = { ...(req.body || {}) };
    if (!body.request_type && body.plan_requested === "premium") {
      body.request_type = "plan";
      body.duration_months = body.duration_months ?? 12;
    }
    const parsed = subscriptionRequestSchema.safeParse(body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const data = parsed.data;
    const requestType = data.request_type || "plan";
    const freePlan = await subscriptionPlanModel.findBySlug("free");
    if (!freePlan) {
      return res.status(500).json({ error: "Plans are not configured" });
    }

    let targetPlanId = data.target_plan_id;
    let durationMonths = data.duration_months ?? 1;
    if (requestType === "plan") {
      if (!targetPlanId && data.plan_requested === "premium") {
        const prem = await subscriptionPlanModel.findBySlug("premium");
        if (!prem) {
          return res.status(500).json({ error: "Premium plan is not configured" });
        }
        targetPlanId = prem.id;
      }
      if (!targetPlanId) {
        return res.status(400).json({ error: "target_plan_id is required" });
      }
      if (targetPlanId === freePlan.id) {
        return res.status(400).json({ error: "Choose a paid plan to request an upgrade" });
      }
      const eff = await getEffectivePlanRow(store);
      if (!planExpired(store) && eff.slug !== "free") {
        return res.status(400).json({
          error: "Your store already has an active paid subscription.",
        });
      }
    } else {
      targetPlanId = null;
      durationMonths = data.duration_months ?? 1;
      if (verifiedEffective(store)) {
        return res.status(400).json({
          error: "Your store is already verified.",
        });
      }
    }

    const pending = await subscriptionRequestModel.findPendingByStoreId(
      store.id
    );
    if (pending) {
      return res.status(409).json({
        error:
          "You already have a pending request. We will review it soon.",
      });
    }
    const planRow =
      requestType === "plan" && targetPlanId
        ? await subscriptionPlanModel.findById(targetPlanId)
        : null;
    const row = await subscriptionRequestModel.createRow({
      storeId: store.id,
      requestType,
      targetPlanId: requestType === "plan" ? targetPlanId : null,
      durationMonths,
      contactPhone: data.contact_phone,
      notes: data.notes,
      planRequested: planRow?.slug || data.plan_requested || null,
    });
    res.status(201).json({ request: row });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not submit request" });
  }
}

module.exports = {
  overview,
  getMyStore,
  updateMyStore,
  patchMyStoreJson,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  listOrders,
  patchOrder,
  getPlanUsage,
  listPlanCatalog,
  createSubscriptionRequest,
};
