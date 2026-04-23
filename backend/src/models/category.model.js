const { getSupabase } = require("../lib/supabase");

const TABLE = "product_categories";

async function listAllOrdered() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("slug,name_en,name_so,sort_order")
    .order("sort_order", { ascending: true })
    .order("slug", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function listBySlugs(slugs) {
  const uniq = [...new Set((slugs || []).map(String).filter(Boolean))];
  if (uniq.length === 0) return [];
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("slug,name_en,name_so,sort_order")
    .in("slug", uniq)
    .order("sort_order", { ascending: true })
    .order("slug", { ascending: true });
  if (error) throw error;
  return data || [];
}

/**
 * Ensure a row exists for vendor-created slugs (idempotent insert).
 */
async function ensureCategory(slug, displayLabel) {
  const safeSlug = (slug || "general").toString().slice(0, 120) || "general";
  const supabase = getSupabase();
  const { data: existing, error: e1 } = await supabase
    .from(TABLE)
    .select("slug")
    .eq("slug", safeSlug)
    .maybeSingle();
  if (e1) throw e1;
  if (existing) return;
  const label = String(displayLabel || safeSlug).trim() || safeSlug;
  const { error } = await supabase.from(TABLE).insert({
    slug: safeSlug,
    name_en: label,
    name_so: label,
    sort_order: 100,
  });
  if (error && error.code !== "23505") throw error;
}

module.exports = {
  listAllOrdered,
  listBySlugs,
  ensureCategory,
};
