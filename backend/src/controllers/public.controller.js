const { z } = require("zod");
const storeModel = require("../models/store.model");
const { verifiedEffective } = require("../lib/store-effective-plan");
const productModel = require("../models/product.model");
const orderModel = require("../models/order.model");
const ratingModel = require("../models/rating.model");
const followModel = require("../models/follow.model");
const userModel = require("../models/user.model");

const cartLineSchema = z.object({
  product_id: z.string().uuid(),
  name: z.string().trim().max(500).optional().nullable(),
  quantity: z.number().int().positive().max(9999),
  price: z.number(),
});

const createOrderBodySchema = z.object({
  customer_name: z.string().trim().max(200).optional().nullable(),
  customer_phone: z.string().trim().max(40).optional().nullable(),
  message: z.string().trim().max(4000).optional().nullable(),
  items_summary: z.string().trim().max(8000).optional().nullable(),
  total: z.union([z.number(), z.string()]).optional().nullable(),
  product_id: z.string().uuid().optional().nullable(),
  products: z.array(cartLineSchema).max(100).optional().nullable(),
});

function mapPublicStore(row) {
  if (!row) return null;
  const loc = row.location || {};
  return {
    id: row.id,
    slug: row.slug,
    store_name: row.store_name,
    logo: row.logo,
    banner_url: row.banner_url,
    description: row.description,
    whatsapp_phone: row.whatsapp_phone,
    location: loc,
    status: row.status,
    created_at: row.created_at,
    plan: row.plan || "free",
    verified: verifiedEffective(row),
  };
}

function mapPublicProduct(p, store) {
  const images = Array.isArray(p.images) ? p.images : [];
  const features = Array.isArray(p.features)
    ? p.features.map(String).filter(Boolean)
    : [];
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: Number(p.price),
    old_price: p.old_price != null ? Number(p.old_price) : null,
    category: p.category,
    images,
    image: images[0] || null,
    video_url: p.video_url,
    features,
    in_stock: p.in_stock,
    created_at: p.created_at,
    store_slug: store.slug,
    whatsapp: store.whatsapp_phone || "",
  };
}

async function getPublicStore(req, res) {
  try {
    const { slug } = req.params;
    const store = await storeModel.findBySlug(slug);
    if (!store || store.status === "rejected") {
      return res.status(404).json({ error: "Store not found" });
    }
    const products = await productModel.listByStoreId(store.id);
    const q = (req.query.q || "").toString().trim().toLowerCase();
    let list = products.map((p) => mapPublicProduct(p, store));
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q))
      );
    }
    const { average: rating_average, count: rating_count } =
      await ratingModel.aggregateForStore(store.id);
    const reviewRows = await ratingModel.listByStoreId(store.id, 25);
    const reviewerIds = [...new Set(reviewRows.map((r) => r.customer_id))];
    const reviewers = await userModel.findByIds(reviewerIds);
    const nameById = Object.fromEntries(
      reviewers.map((u) => [u.id, u.name || ""])
    );
    const reviews = reviewRows.map((r) => {
      const full = (nameById[r.customer_id] || "Buyer").trim();
      const first = full.split(/\s+/)[0] || "Buyer";
      return {
        rating: r.rating,
        feedback: r.feedback,
        created_at: r.created_at,
        author_label: first,
      };
    });
    let is_following = false;
    if (req.user && req.user.role === "customer") {
      is_following = await followModel.isFollowing(req.user.id, store.id);
    }
    res.json({
      store: {
        ...mapPublicStore(store),
        rating_average,
        rating_count,
        is_following,
      },
      products: list,
      reviews,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load store" });
  }
}

async function createOrderRequest(req, res) {
  try {
    const { slug } = req.params;
    const store = await storeModel.findBySlug(slug);
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }
    const parsed = createOrderBodySchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid order payload",
        details: parsed.error.flatten(),
      });
    }
    const {
      customer_name,
      customer_phone,
      message,
      items_summary,
      total,
      product_id,
      products: productsBody,
    } = parsed.data;
    let productId = product_id || null;
    let productRow = null;
    if (productId) {
      productRow = await productModel.findById(productId);
      if (!productRow || productRow.store_id !== store.id) {
        return res.status(400).json({ error: "Invalid product for this store" });
      }
    }
    const productsLines = Array.isArray(productsBody) ? productsBody : [];
    let productRowsById = {};
    if (productsLines.length > 0) {
      const ids = [...new Set(productsLines.map((l) => l.product_id))];
      const productRows = await productModel.findByIds(ids);
      productRowsById = Object.fromEntries(productRows.map((p) => [p.id, p]));
      for (const line of productsLines) {
        const p = productRowsById[line.product_id];
        if (!p || p.store_id !== store.id) {
          return res.status(400).json({ error: "Invalid product for this store" });
        }
      }
    }
    let totalNum = 0;
    if (total != null && total !== "") {
      const n = typeof total === "number" ? total : Number(total);
      totalNum = Number.isFinite(n) ? n : 0;
    }
    let summary = items_summary || null;
    if (productRow && !summary) summary = productRow.name;
    if (!summary && productsLines.length > 0) {
      summary = productsLines
        .map((row) => {
          const label =
            row.name?.trim() || productRowsById[row.product_id]?.name || "Item";
          return `${label} × ${row.quantity}`;
        })
        .join("; ");
    }
    const customerId =
      req.user && req.user.role === "customer" ? req.user.id : null;
    const order = await orderModel.createOrder({
      store_id: store.id,
      status: "pending",
      customer_name: customer_name || null,
      customer_phone: customer_phone || null,
      message: message || null,
      items_summary: summary,
      total: totalNum,
      product_id: productId,
      customer_id: customerId,
      products: productsLines.map((l) => ({
        product_id: l.product_id,
        name: l.name ?? null,
        quantity: l.quantity,
        price: l.price,
      })),
    });
    res.status(201).json({ order });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not create order request" });
  }
}

module.exports = {
  getPublicStore,
  createOrderRequest,
};
