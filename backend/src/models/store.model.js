const { getSupabase } = require("../lib/supabase");

const TABLE = "stores";

async function createStore({
  userId,
  storeName,
  slug,
  logo,
  bannerUrl,
  description,
  location,
  whatsappPhone,
  status,
  planId,
  planSlug,
}) {
  const supabase = getSupabase();
  const insert = {
    user_id: userId,
    store_name: storeName.trim(),
    slug,
    logo: logo || null,
    banner_url: bannerUrl || null,
    description: description || null,
    location,
    whatsapp_phone: whatsappPhone || null,
    status: status || "approved",
  };
  if (planId) insert.plan_id = planId;
  if (planSlug) insert.plan = planSlug;
  const { data, error } = await supabase
    .from(TABLE)
    .insert(insert)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function findByUserId(userId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findBySlug(slug) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
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

async function updateStore(id, patch) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function slugExists(slug) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

/** Slug free for this store (same slug allowed for same row). */
async function ensureUniqueSlug(base, storeId) {
  let slug = base;
  let n = 0;
  while (true) {
    const row = await findBySlug(slug);
    if (!row || row.id === storeId) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

/** First free slug for a new store (no id yet). */
async function ensureNewSlug(base) {
  let slug = base;
  let n = 0;
  while (await slugExists(slug)) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

async function listApproved() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function listAll(limit = 200) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
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

async function deleteById(id) {
  const supabase = getSupabase();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

async function incrementAiGenerations(storeId, delta = 1) {
  const row = await findById(storeId);
  if (!row) throw new Error("Store not found");
  const next = (row.ai_generations_used ?? 0) + delta;
  return updateStore(storeId, { ai_generations_used: next });
}

function utcTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

/** Bump AI usage for the current UTC calendar day (resets when the date changes). */
async function incrementAiGenerationsDaily(storeId, delta = 1) {
  const row = await findById(storeId);
  if (!row) throw new Error("Store not found");
  const today = utcTodayDateString();
  const raw = row.ai_generations_daily_utc_date;
  const stored = raw ? String(raw).slice(0, 10) : null;
  if (stored !== today) {
    return updateStore(storeId, {
      ai_generations_daily_utc_date: today,
      ai_generations_daily_used: delta,
    });
  }
  const next = (row.ai_generations_daily_used ?? 0) + delta;
  return updateStore(storeId, { ai_generations_daily_used: next });
}

module.exports = {
  createStore,
  findByUserId,
  findBySlug,
  findById,
  updateStore,
  slugExists,
  ensureUniqueSlug,
  ensureNewSlug,
  listApproved,
  listAll,
  countRows,
  deleteById,
  incrementAiGenerations,
  incrementAiGenerationsDaily,
};
