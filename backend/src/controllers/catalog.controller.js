const { z } = require("zod");
const productModel = require("../models/product.model");
const storeModel = require("../models/store.model");
const { verifiedEffective } = require("../lib/store-effective-plan");

const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((s) => {
      if (!s || s === "All") return undefined;
      return s;
    }),
  location: z.string().trim().max(160).optional().default("all"),
  sort: z
    .enum(["latest", "popular", "price-asc", "price-desc"])
    .default("latest"),
  q: z.string().trim().max(200).optional(),
  priceMin: z.preprocess((v) => {
    if (v === "" || v == null || v === undefined) return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }, z.number().min(0).max(1e7)),
  priceMax: z.preprocess((v) => {
    if (v === "" || v == null || v === undefined) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }, z.number().min(0).max(1e7).optional()),
  inStockOnly: z.preprocess((v) => {
    if (v == null || v === "") return false;
    const s = String(v).toLowerCase();
    return s === "true" || s === "1" || s === "yes";
  }, z.boolean()),
});

function storeMatchesLocationFilter(storeRow, locationKey) {
  const key = (locationKey || "all").toString();
  if (key === "all") return true;
  const loc = storeRow.location || {};
  const city = String(loc.city || "");
  const region = String(loc.region || "");
  if (key.startsWith("region:")) {
    return region === key.slice(7);
  }
  return city === key;
}

function resolveStoreIdsForCatalog(approvedStores, locationKey) {
  return approvedStores
    .filter((s) => storeMatchesLocationFilter(s, locationKey))
    .map((s) => s.id);
}

const PLACEHOLDER = "/placeholder-product.svg";

function normalizeFeatures(row) {
  const f = row?.features;
  if (!f) return [];
  if (Array.isArray(f)) return f.map(String).filter(Boolean).slice(0, 30);
  return [];
}

function mapProduct(p, store) {
  const loc = store.location || {};
  const images = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
  const img = images[0] || PLACEHOLDER;
  const gallery = images.length > 0 ? images : [img];
  const created = p.created_at || new Date().toISOString();
  return {
    id: p.id,
    storeId: store.id,
    storeSlug: store.slug,
    name: p.name,
    price: Number(p.price),
    oldPrice: p.old_price != null ? Number(p.old_price) : undefined,
    category: p.category,
    location: loc.city || "",
    image: img,
    images: gallery,
    videoUrl: p.video_url?.trim() || undefined,
    description: p.description?.trim() || undefined,
    features: normalizeFeatures(p),
    popular: false,
    popularityScore: new Date(created).getTime(),
    createdAt: created,
    inStock: p.in_stock !== false,
    vendor: store.store_name,
    whatsapp: store.whatsapp_phone || "",
    vendorVerified: verifiedEffective(store),
  };
}

function mapStore(s, productCount) {
  const loc = s.location || {};
  return {
    id: s.id,
    slug: s.slug,
    name: s.store_name,
    logo: s.logo || PLACEHOLDER,
    bannerUrl: s.banner_url?.trim() || null,
    city: loc.city || "",
    region: loc.region || "",
    whatsapp: s.whatsapp_phone || "",
    productCount,
    verified: verifiedEffective(s),
  };
}

async function listStores(req, res) {
  try {
    const stores = (await storeModel.listApproved()).sort(
      (a, b) =>
        Number(verifiedEffective(b)) - Number(verifiedEffective(a))
    );
    const ids = stores.map((s) => s.id);
    const { products: counts } = await productModel.aggregateCountsForStores(ids);
    const withCounts = stores.map((s) => mapStore(s, counts.get(s.id) || 0));
    res.json({ stores: withCounts });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load stores" });
  }
}

async function listProducts(req, res) {
  try {
    const parsed = listProductsQuerySchema.safeParse(req.query || {});
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid query",
        details: parsed.error.flatten(),
      });
    }
    const {
      page,
      limit,
      category,
      location,
      sort,
      q,
      priceMin,
      priceMax,
      inStockOnly,
    } = parsed.data;

    const approved = await storeModel.listApproved();
    const storeIds = resolveStoreIdsForCatalog(approved, location);
    if (storeIds.length === 0) {
      return res.json({ products: [], page, limit, total: 0 });
    }

    const byId = new Map(approved.map((s) => [s.id, s]));
    const effectivePriceMax =
      priceMax != null && !Number.isNaN(priceMax) ? priceMax : undefined;

    const filterOpts = {
      storeIds,
      category: category || null,
      priceMin,
      priceMax: effectivePriceMax,
      search: q,
      inStockOnly,
    };

    const offset = (page - 1) * limit;
    const [total, rows] = await Promise.all([
      productModel.countCatalogRows(filterOpts),
      productModel.listCatalogRows({
        ...filterOpts,
        sort,
        offset,
        limit,
      }),
    ]);

    const products = rows
      .filter((p) => byId.has(p.store_id))
      .map((p) => mapProduct(p, byId.get(p.store_id)));

    res.json({ products, page, limit, total });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load products" });
  }
}

async function getProduct(req, res) {
  try {
    const { id } = req.params;
    const p = await productModel.findById(id);
    if (!p) return res.status(404).json({ error: "Product not found" });
    const store = await storeModel.findById(p.store_id);
    if (!store || store.status !== "approved") {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json({ product: mapProduct(p, store) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load product" });
  }
}

async function batchProducts(req, res) {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const uniq = [...new Set(ids.map(String).filter(Boolean))].slice(0, 50);
    if (uniq.length === 0) return res.json({ products: [] });

    const rows = await productModel.findByIds(uniq);
    const approved = await storeModel.listApproved();
    const byId = new Map(approved.map((s) => [s.id, s]));

    const products = rows
      .filter((p) => byId.has(p.store_id))
      .map((p) => mapProduct(p, byId.get(p.store_id)));

    res.json({ products });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load products" });
  }
}

module.exports = {
  listStores,
  listProducts,
  getProduct,
  batchProducts,
};
