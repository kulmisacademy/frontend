const { getSupabase } = require("../lib/supabase");

const TABLE = "products";

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

async function createProduct(row) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function updateProduct(id, patch) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function deleteProduct(id) {
  const supabase = getSupabase();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
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

/** Products that have a non-empty video (upload or URL). */
async function countVideosByStoreId(storeId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("video_url")
    .eq("store_id", storeId);
  if (error) throw error;
  const rows = data || [];
  return rows.filter((r) => {
    const v = r.video_url;
    return typeof v === "string" && v.trim().length > 0;
  }).length;
}

async function aggregateCountsForStores(storeIds) {
  if (!storeIds.length) {
    return { products: new Map(), videos: new Map() };
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("store_id, video_url")
    .in("store_id", storeIds);
  if (error) throw error;
  const products = new Map();
  const videos = new Map();
  for (const id of storeIds) {
    products.set(id, 0);
    videos.set(id, 0);
  }
  for (const row of data || []) {
    const sid = row.store_id;
    products.set(sid, (products.get(sid) || 0) + 1);
    const v = row.video_url;
    if (typeof v === "string" && v.trim().length > 0) {
      videos.set(sid, (videos.get(sid) || 0) + 1);
    }
  }
  return { products, videos };
}

async function listAll(limit = 500) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

async function findByIds(ids) {
  if (!ids || ids.length === 0) return [];
  const supabase = getSupabase();
  const { data, error } = await supabase.from(TABLE).select("*").in("id", ids);
  if (error) throw error;
  return data || [];
}

async function countRows() {
  const supabase = getSupabase();
  const { count, error } = await supabase
    .from(TABLE)
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

/** Escape `%` / `_` for PostgREST `ilike` patterns inside `.or(...)`. */
function sanitizeIlikeTerm(raw) {
  const s = String(raw || "")
    .replace(/\s+/g, " ")
    .replace(/,/g, " ")
    .trim()
    .slice(0, 200);
  if (!s) return "";
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** Apply catalog filters (caller must already scope `store_id` with `.in(...)`). */
function applyCatalogFilters(query, { category, priceMin, priceMax, search, inStockOnly }) {
  let q = query;
  if (category) q = q.eq("category", category);
  if (typeof priceMin === "number" && priceMin > 0) q = q.gte("price", priceMin);
  if (typeof priceMax === "number" && !Number.isNaN(priceMax)) q = q.lte("price", priceMax);
  if (inStockOnly) q = q.eq("in_stock", true);
  if (search) {
    const term = sanitizeIlikeTerm(String(search).trim());
    if (term) {
      const pattern = `%${term}%`;
      const quoted = `"${pattern.replace(/"/g, '""')}"`;
      q = q.or(`name.ilike.${quoted},description.ilike.${quoted}`);
    }
  }
  return q;
}

/** Paginated products for public catalog (approved stores), with DB-level filters. */
async function listCatalogRows(opts) {
  const {
    storeIds,
    category,
    priceMin,
    priceMax,
    search,
    inStockOnly,
    sort,
    offset,
    limit,
  } = opts;
  if (!storeIds.length) return [];
  const supabase = getSupabase();
  let q = supabase.from(TABLE).select("*").in("store_id", storeIds);
  q = applyCatalogFilters(q, {
    category: category || null,
    priceMin,
    priceMax,
    search,
    inStockOnly: !!inStockOnly,
  });
  if (sort === "price-asc") q = q.order("price", { ascending: true });
  else if (sort === "price-desc") q = q.order("price", { ascending: false });
  else q = q.order("created_at", { ascending: false });
  const end = offset + Math.max(0, limit) - 1;
  q = q.range(offset, end);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

async function countCatalogRows(opts) {
  const { storeIds, category, priceMin, priceMax, search, inStockOnly } = opts;
  if (!storeIds.length) return 0;
  const supabase = getSupabase();
  let q = supabase
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .in("store_id", storeIds);
  q = applyCatalogFilters(q, {
    category: category || null,
    priceMin,
    priceMax,
    search,
    inStockOnly: !!inStockOnly,
  });
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

module.exports = {
  listByStoreId,
  findById,
  createProduct,
  updateProduct,
  deleteProduct,
  countByStoreId,
  countVideosByStoreId,
  aggregateCountsForStores,
  listAll,
  findByIds,
  countRows,
  listCatalogRows,
  countCatalogRows,
};
