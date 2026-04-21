const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { loadEnv } = require("../config/env");
const userModel = require("../models/user.model");
const storeModel = require("../models/store.model");
const { slugify } = require("../lib/slug");
const {
  isTransientStorageFailure,
  sleep,
} = require("../lib/retry-network");
const { capitalForRegion } = require("../lib/somalia");
const passwordResetModel = require("../models/password-reset.model");
const orderModel = require("../models/order.model");
const ratingModel = require("../models/rating.model");
const followModel = require("../models/follow.model");
const { getSupabase } = require("../lib/supabase");
const { sendMail } = require("../lib/mail");
const affiliateModel = require("../models/affiliate.model");
const affiliateReferralModel = require("../models/affiliate-referral.model");
const {
  syncReferralQualificationForStore,
} = require("../lib/affiliate-qualification");

function touchAffiliateQualification(storeId) {
  return syncReferralQualificationForStore(storeId).catch((e) => {
    console.error("[affiliate-qualification]", e);
  });
}

const registerCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().min(5).max(40),
  password: z.string().min(8).max(128),
});

const registerVendorFieldsSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().min(5).max(40),
  password: z.string().min(8).max(128),
  store_name: z.string().min(1).max(200),
  country: z.string().max(120).optional(),
  region: z.string().min(1).max(120),
  city: z.string().max(120).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const forgotSchema = z.object({
  email: z.string().email(),
});

const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(128),
});

/** Normalize PostgREST / Supabase / generic throws */
function errorToMessage(e) {
  if (e == null) return "Unknown error";
  if (typeof e === "string") return e;
  if (typeof e.message === "string" && e.message.length) return e.message;
  if (typeof e.details === "string" && e.details.length) return e.details;
  if (typeof e.hint === "string" && e.hint.length) return e.hint;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

/** Map thrown errors to HTTP responses for vendor registration */
function respondRegisterVendorError(e, res) {
  console.error("[registerVendor]", e);
  if (res.headersSent) {
    console.error("[registerVendor] response already sent; cannot report error");
    return;
  }
  const msg = errorToMessage(e);
  const pgCode = e?.code != null ? String(e.code) : "";

  if (pgCode === "23505" || /duplicate key|unique constraint/i.test(msg)) {
    return res.status(409).json({ error: "Email already registered" });
  }
  if (/JWT_SECRET|jwtSecret/i.test(msg)) {
    return res.status(500).json({
      error:
        "JWT_SECRET is not set on the API. Add JWT_SECRET to backend/.env.local (must match frontend JWT_SECRET), restart the API, then try again.",
    });
  }
  if (/Supabase is not configured/i.test(msg)) {
    return res.status(500).json({
      error:
        "API is missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.local and restart the API.",
    });
  }
  if (
    pgCode === "PGRST205" ||
    /Could not find the table|schema cache/i.test(msg)
  ) {
    return res.status(503).json({
      error:
        "Database tables are missing. In Supabase: SQL Editor → paste and run backend/supabase/RUN_ALL.sql (one shot), then try registration again.",
    });
  }
  if (
    /column .* does not exist|Could not find the .* column/i.test(msg)
  ) {
    return res.status(500).json({
      error:
        "Database schema is outdated. In Supabase SQL Editor, run backend/supabase/RUN_ALL.sql, then try again.",
    });
  }
  if (/permission denied|row-level security|\bRLS\b/i.test(msg)) {
    return res.status(500).json({
      error:
        "Database blocked the insert. Use SUPABASE_SERVICE_ROLE_KEY (service_role) in backend/.env.local, not the anon key.",
    });
  }
  const short = msg.length > 220 ? `${msg.slice(0, 220)}…` : msg;
  return res.status(500).json({
    error: short,
    code: pgCode || undefined,
    details: typeof e?.details === "string" ? e.details : undefined,
    hint: typeof e?.hint === "string" ? e.hint : undefined,
  });
}

function signToken(user) {
  const { jwtSecret, jwtExpiresIn } = loadEnv();
  if (!jwtSecret) {
    throw new Error(
      "JWT_SECRET is not set on the API. Add JWT_SECRET to backend/.env.local (same value as frontend) and restart the server."
    );
  }
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    jwtSecret,
    { expiresIn: jwtExpiresIn }
  );
}

async function uploadLogoToStorage(userId, file) {
  const { storageBucket } = loadEnv();
  const supabase = getSupabase();
  const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/${Date.now()}-${safeName}`;

  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const { error } = await supabase.storage
        .from(storageBucket)
        .upload(path, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });
      if (!error) {
        const {
          data: { publicUrl },
        } = supabase.storage.from(storageBucket).getPublicUrl(path);
        return publicUrl;
      }
      if (attempt < maxAttempts - 1 && isTransientStorageFailure(error)) {
        await sleep(400 * (attempt + 1));
        continue;
      }
      break;
    } catch (err) {
      if (attempt < maxAttempts - 1 && isTransientStorageFailure(err)) {
        await sleep(400 * (attempt + 1));
        continue;
      }
      break;
    }
  }

  const maxB64 = 400 * 1024;
  if (file.buffer.length > maxB64) {
    throw new Error(
      "Logo upload failed and image is too large for inline fallback. Configure Supabase Storage bucket store-logos."
    );
  }
  const b64 = file.buffer.toString("base64");
  return `data:${file.mimetype};base64,${b64}`;
}

async function registerCustomer(req, res) {
  try {
    const parsed = registerCustomerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { name, email, phone, password } = parsed.data;
    const existing = await userModel.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await userModel.createUser({
      name,
      email,
      phone,
      passwordHash,
      role: "customer",
    });
    const token = signToken(user);
    res.status(201).json({
      message: "Account created",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Registration failed" });
  }
}

async function registerVendor(req, res) {
  try {
    const env = loadEnv();
    if (!env.jwtSecret?.trim()) {
      return res.status(503).json({
        error:
          "JWT_SECRET is empty. Add JWT_SECRET to backend/.env.local (same value as in frontend/.env.local), save, and restart the API.",
      });
    }
    if (!env.supabaseUrl?.trim() || !env.supabaseServiceKey?.trim()) {
      return res.status(503).json({
        error:
          "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.local and restart the API.",
      });
    }

    const body = {
      ...req.body,
      store_name: req.body.store_name,
    };
    const parsed = registerVendorFieldsSchema.safeParse(body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Store logo is required" });
    }
    const { name, email, phone, password, store_name, region } = parsed.data;
    const refRaw =
      typeof req.body.ref_code === "string" ? req.body.ref_code.trim() : "";
    const country = parsed.data.country?.trim() || "Somalia";
    const city =
      (parsed.data.city && parsed.data.city.trim()) ||
      capitalForRegion(region);
    if (!city) {
      return res.status(400).json({ error: "Invalid Somalia region" });
    }

    const existing = await userModel.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    let referredByAffiliateId = null;
    if (refRaw) {
      const aff = await affiliateModel.findByRefCode(refRaw.toUpperCase());
      if (aff) {
        if (aff.email === email.toLowerCase().trim()) {
          return res.status(400).json({
            error:
              "You cannot register a store using your own affiliate referral code.",
          });
        }
        referredByAffiliateId = aff.id;
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await userModel.createUser({
      name,
      email,
      phone,
      passwordHash,
      role: "vendor",
    });

    let logoUrl;
    try {
      logoUrl = await uploadLogoToStorage(user.id, req.file);
    } catch (err) {
      console.error(err);
      return res.status(400).json({
        error:
          errorToMessage(err) ||
          "Could not process logo. Configure Supabase Storage or use a smaller image.",
      });
    }

    const location = { country, region, city };
    const baseSlug = slugify(store_name);
    const slug = await storeModel.ensureNewSlug(baseSlug);

    const subscriptionPlanModel = require("../models/subscription-plan.model");
    const freePlan = await subscriptionPlanModel.findBySlug("free");

    const store = await storeModel.createStore({
      userId: user.id,
      storeName: store_name,
      slug,
      logo: logoUrl,
      bannerUrl: null,
      description: null,
      location,
      whatsappPhone: phone.replace(/\s/g, ""),
      status: "approved",
      planId: freePlan?.id,
      planSlug: freePlan?.slug || "free",
      referredByAffiliateId,
    });

    if (referredByAffiliateId) {
      await affiliateReferralModel.createReferral({
        affiliateId: referredByAffiliateId,
        storeId: store.id,
        status: "pending",
      });
    }
    touchAffiliateQualification(store.id);

    const token = signToken(user);
    res.status(201).json({
      message: "Vendor account and store created — your store is live",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
      store: {
        id: store.id,
        slug: store.slug,
        store_name: store.store_name,
        status: store.status,
        location: store.location,
      },
    });
  } catch (e) {
    respondRegisterVendorError(e, res);
  }
}

async function login(req, res) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { email, password } = parsed.data;
    const userRow = await userModel.findByEmail(email);
    if (!userRow) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const ok = await bcrypt.compare(password, userRow.password);
    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const user = await userModel.findById(userRow.id);
    if (user.role === "admin") {
      return res.status(403).json({
        error:
          "Admin accounts use the secure admin sign-in only (not this page).",
      });
    }
    const token = signToken({
      id: user.id,
      role: user.role,
      email: user.email,
    });
    let store = null;
    if (user.role === "vendor") {
      store = await storeModel.findByUserId(user.id);
    }
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
      store,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Login failed" });
  }
}

async function forgotPassword(req, res) {
  try {
    const parsed = forgotSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { email } = parsed.data;
    const user = await userModel.findByEmail(email);
    if (!user) {
      return res.json({
        message:
          "If an account exists for this email, you will receive reset instructions.",
      });
    }
    const { token } = await passwordResetModel.createResetRecord(user.id);
    const { frontendUrl } = loadEnv();
    const link = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

    const text = [
      "Hello,",
      "",
      "We received a request to reset your LAAS24 password.",
      "",
      `Open this link to choose a new password (valid for 1 hour):`,
      link,
      "",
      "If you did not request this, you can ignore this email.",
      "",
      "— LAAS24",
    ].join("\n");

    const linkHtml = link.replace(/&/g, "&amp;");
    const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:16px;line-height:1.5;color:#0f172a;background:#f8fafc;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px 24px;border:1px solid #e2e8f0;">
    <tr><td>
      <p style="margin:0 0 12px;">Hello,</p>
      <p style="margin:0 0 16px;">We received a request to reset your <strong>LAAS24</strong> password.</p>
      <p style="margin:0 0 20px;">
        <a href="${link}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;">Create new password</a>
      </p>
      <p style="margin:0 0 8px;font-size:14px;color:#64748b;">Or copy this link into your browser:</p>
      <p style="margin:0 0 16px;word-break:break-all;font-size:13px;color:#334155;">${linkHtml}</p>
      <p style="margin:0;font-size:14px;color:#64748b;">This link expires in <strong>1 hour</strong>. If you didn’t request a reset, you can ignore this email.</p>
    </td></tr>
  </table>
</body>
</html>`;

    await sendMail({
      to: user.email,
      subject: "Reset your LAAS24 password",
      text,
      html,
    });

    res.json({
      message:
        "If an account exists for this email, you will receive reset instructions.",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not process request" });
  }
}

async function resetPassword(req, res) {
  try {
    const parsed = resetSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { token, password } = parsed.data;
    const userId = await passwordResetModel.findUserIdByToken(token);
    if (!userId) {
      return res.status(400).json({ error: "Invalid or expired reset link" });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await userModel.updatePassword(userId, passwordHash);
    await passwordResetModel.deleteByUserId(userId);
    res.json({ message: "Password updated. You can sign in now." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not reset password" });
  }
}

async function me(req, res) {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    let store = null;
    if (user.role === "vendor") {
      store = await storeModel.findByUserId(user.id);
    }
    res.json({ user, store });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
}

function mergeOrdersUnique(listA, listB) {
  const m = new Map();
  for (const o of listA) m.set(o.id, o);
  for (const o of listB) m.set(o.id, o);
  return [...m.values()].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
}

/** Customer order history (account id + legacy phone match) */
async function customerOrders(req, res) {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role !== "customer") {
      return res.json({ orders: [] });
    }
    const byCustomerId = await orderModel.listByCustomerId(user.id);
    let byPhone = [];
    if (user.phone && orderModel.normalizePhone(user.phone).length >= 5) {
      byPhone = await orderModel.listByCustomerPhone(user.phone);
    }
    const merged = mergeOrdersUnique(byCustomerId, byPhone);
    const enriched = await orderModel.enrichOrdersWithStoresAndProducts(merged);
    const ratedSet = await ratingModel.orderIdsRated(
      enriched.map((o) => o.id)
    );
    const phoneOk =
      user.phone && orderModel.normalizePhone(user.phone).length >= 5;
    const userDigits = phoneOk ? orderModel.normalizePhone(user.phone) : "";
    const orders = enriched.map((o) => {
      const ownsById = o.customer_id === user.id;
      const ownsByPhone =
        !o.customer_id &&
        phoneOk &&
        orderModel.normalizePhone(o.customer_phone) === userDigits;
      const owns = ownsById || ownsByPhone;
      const has_rated = ratedSet.has(o.id);
      const can_rate = o.status === "approved" && owns && !has_rated;
      return {
        ...o,
        can_rate,
        has_rated,
      };
    });
    res.json({ orders });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not load orders" });
  }
}

async function rateOrder(req, res) {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user || user.role !== "customer") {
      return res.status(403).json({ error: "Only customers can rate orders" });
    }
    const parsed = z
      .object({
        rating: z.number().int().min(1).max(5),
        feedback: z.string().trim().max(2000).optional().nullable(),
      })
      .safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid rating",
        details: parsed.error.flatten(),
      });
    }
    const order = await orderModel.findById(req.params.id);
    if (!order || order.status !== "approved") {
      return res.status(400).json({ error: "Order is not eligible for rating" });
   }
    const phoneOk =
      user.phone && orderModel.normalizePhone(user.phone).length >= 5;
    const userDigits = phoneOk ? orderModel.normalizePhone(user.phone) : "";
    const ownsById = order.customer_id === user.id;
    const ownsByPhone =
      !order.customer_id &&
      phoneOk &&
      orderModel.normalizePhone(order.customer_phone) === userDigits;
    if (!ownsById && !ownsByPhone) {
      return res.status(403).json({ error: "Not your order" });
    }
    const existing = await ratingModel.findByOrderId(order.id);
    if (existing) {
      return res.status(400).json({ error: "Already rated" });
    }
    await ratingModel.createRating({
      store_id: order.store_id,
      customer_id: user.id,
      order_id: order.id,
      rating: parsed.data.rating,
      feedback: parsed.data.feedback || null,
    });
    res.status(201).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not save rating" });
  }
}

async function followStore(req, res) {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user || user.role !== "customer") {
      return res.status(403).json({ error: "Only customers can follow stores" });
    }
    const store = await storeModel.findBySlug(req.params.slug);
    if (!store || store.status === "rejected") {
      return res.status(404).json({ error: "Store not found" });
    }
    try {
      await followModel.follow(user.id, store.id);
    } catch (e) {
      if (e && e.code !== "23505") throw e;
    }
    res.status(201).json({ following: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not follow store" });
  }
}

async function unfollowStore(req, res) {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user || user.role !== "customer") {
      return res.status(403).json({ error: "Only customers can unfollow stores" });
    }
    const store = await storeModel.findBySlug(req.params.slug);
    if (!store) return res.status(404).json({ error: "Store not found" });
    await followModel.unfollow(user.id, store.id);
    res.json({ following: false });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not unfollow" });
  }
}

async function followStatus(req, res) {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user || user.role !== "customer") {
      return res.json({ following: false });
    }
    const store = await storeModel.findBySlug(req.params.slug);
    if (!store) return res.status(404).json({ error: "Store not found" });
    const following = await followModel.isFollowing(user.id, store.id);
    res.json({ following });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not load follow status" });
  }
}

async function followedStores(req, res) {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user || user.role !== "customer") {
      return res.json({ stores: [] });
    }
    const rows = await followModel.listStoresForCustomer(user.id);
    const stores = await Promise.all(
      rows.map(async (r) => {
        const s = await storeModel.findById(r.store_id);
        if (!s || s.status === "rejected") return null;
        return {
          store_id: s.id,
          slug: s.slug,
          store_name: s.store_name,
          logo: s.logo,
          followed_at: r.created_at,
        };
      })
    );
    res.json({ stores: stores.filter(Boolean) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not load followed stores" });
  }
}

module.exports = {
  registerCustomer,
  registerVendor,
  login,
  forgotPassword,
  resetPassword,
  me,
  customerOrders,
  rateOrder,
  followStore,
  unfollowStore,
  followStatus,
  followedStores,
};
