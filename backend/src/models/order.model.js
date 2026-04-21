const { getSupabase } = require("../lib/supabase");
const storeModel = require("./store.model");
const productModel = require("./product.model");

const TABLE = "store_orders";

function normalizePhone(p) {
  return String(p || "").replace(/\D/g, "");
}

async function listByStoreId(storeId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function findById(id) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function createOrder(row) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function bumpStoreOrderSeq(storeId) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("bump_store_order_seq", {
    p_store_id: storeId,
  });
  if (error) throw error;
  const n = typeof data === "number" ? data : parseInt(String(data), 10);
  if (!Number.isFinite(n)) {
    throw new Error("Invalid order sequence");
  }
  return n;
}

/** Inserts with per-store ORD-001 style order_code */
async function createOrderWithCode(row) {
  const n = await bumpStoreOrderSeq(row.store_id);
  const order_code = `ORD-${String(n).padStart(3, "0")}`;
  return createOrder({ ...row, order_code });
}

async function updateStatus(id, status) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .update({ status })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function countByStoreId(storeId) {
  const supabase = getSupabase();
  const { count, error } = await supabase
    .from(TABLE)
    .select("*", { count: "exact", head: true })
    .eq("store_id", storeId);
  if (error) throw error;
  return count ?? 0;
}

async function pendingCountByStoreId(storeId) {
  const supabase = getSupabase();
  const { count, error } = await supabase
    .from(TABLE)
    .select("*", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("status", "pending");
  if (error) throw error;
  return count ?? 0;
}

async function approvedCountByStoreId(storeId) {
  const supabase = getSupabase();
  const { count, error } = await supabase
    .from(TABLE)
    .select("*", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("status", "approved");
  if (error) throw error;
  return count ?? 0;
}

/** Orders placed while logged in */
async function listByCustomerId(customerId) {
  if (!customerId) return [];
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data || [];
}

/** Orders matching customer phone (digits only), for buyer history */
async function listByCustomerPhone(phone) {
  const target = normalizePhone(phone);
  if (target.length < 5) return [];
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(400);
  if (error) throw error;
  return (data || []).filter(
    (row) => normalizePhone(row.customer_phone) === target
  );
}

/** @typedef {{ gte?: string; lt?: string; lte?: string }} CreatedBounds */

const ALLOWED_DATE_PRESETS = new Set(["all", "today", "week", "month"]);
const ALLOWED_STATUS_FILTERS = new Set([
  "all",
  "pending",
  "approved",
  "rejected",
]);

/**
 * @param {string} preset
 * @returns {CreatedBounds | null}
 */
function createdAtBounds(preset) {
  if (!preset || preset === "all" || !ALLOWED_DATE_PRESETS.has(preset)) {
    return null;
  }
  const now = new Date();
  if (preset === "today") {
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { gte: start.toISOString(), lt: end.toISOString() };
  }
  if (preset === "week") {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { gte: start.toISOString(), lte: now.toISOString() };
  }
  if (preset === "month") {
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { gte: start.toISOString(), lte: now.toISOString() };
  }
  return null;
}

/**
 * @param {{
 *   storeId?: string | null;
 *   datePreset?: string;
 *   status?: string;
 *   limit?: number;
 * }} opts
 */
async function listFiltered(opts = {}) {
  const {
    storeId = null,
    datePreset = "all",
    status = "all",
    limit: rawLimit = 200,
  } = opts;
  let limit = Number(rawLimit);
  if (!Number.isFinite(limit) || limit < 1) limit = 200;
  if (limit > 500) limit = 500;

  const preset = ALLOWED_DATE_PRESETS.has(datePreset) ? datePreset : "all";
  const st = ALLOWED_STATUS_FILTERS.has(status) ? status : "all";

  const supabase = getSupabase();
  let q = supabase.from(TABLE).select("*");
  if (storeId) {
    q = q.eq("store_id", storeId);
  }
  const bounds = createdAtBounds(preset);
  if (bounds) {
    if (bounds.gte) q = q.gte("created_at", bounds.gte);
    if (bounds.lt) q = q.lt("created_at", bounds.lt);
    if (bounds.lte) q = q.lte("created_at", bounds.lte);
  }
  if (st !== "all") {
    q = q.eq("status", st);
  }
  const { data, error } = await q
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

async function listAll(limit = 200) {
  return listFiltered({ datePreset: "all", status: "all", limit });
}

async function countRows() {
  const supabase = getSupabase();
  const { count, error } = await supabase
    .from(TABLE)
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

async function enrichOrdersWithStores(orders) {
  const ids = [...new Set(orders.map((o) => o.store_id))];
  const rows = await Promise.all(ids.map((id) => storeModel.findById(id)));
  const map = Object.fromEntries(rows.filter(Boolean).map((s) => [s.id, s]));
  return orders.map((o) => ({
    ...o,
    store_slug: map[o.store_id]?.slug ?? null,
    store_name: map[o.store_id]?.store_name ?? null,
  }));
}

async function enrichOrdersWithStoresAndProducts(orders) {
  const withStores = await enrichOrdersWithStores(orders);
  const pids = [
    ...new Set(withStores.map((o) => o.product_id).filter(Boolean)),
  ];
  if (pids.length === 0) {
    return withStores.map((o) => ({ ...o, product_name: null }));
  }
  const products = await productModel.findByIds(pids);
  const pmap = Object.fromEntries(products.map((p) => [p.id, p]));
  return withStores.map((o) => ({
    ...o,
    product_name: o.product_id ? pmap[o.product_id]?.name ?? null : null,
  }));
}

module.exports = {
  listByStoreId,
  findById,
  createOrder,
  createOrderWithCode,
  bumpStoreOrderSeq,
  updateStatus,
  countByStoreId,
  pendingCountByStoreId,
  approvedCountByStoreId,
  normalizePhone,
  listByCustomerId,
  listByCustomerPhone,
  enrichOrdersWithStores,
  enrichOrdersWithStoresAndProducts,
  listFiltered,
  listAll,
  countRows,
};
