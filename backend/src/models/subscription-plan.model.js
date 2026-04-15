const { getSupabase } = require("../lib/supabase");
const { slugify } = require("../lib/slug");

const TABLE = "subscription_plans";

async function findById(id) {
  if (!id) return null;
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findBySlug(slug) {
  if (!slug) return null;
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("slug", String(slug).trim().toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function listAll() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return data || [];
}

/** Paid / custom plans shown in vendor upgrade catalog (excludes free). */
async function listUpgradeCatalog() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select(
      "id, name, slug, price, product_limit, video_limit, ai_limit, ai_daily_limit, sort_order"
    )
    .eq("active", true)
    .neq("slug", "free")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function createPlan({
  name,
  slug,
  price,
  productLimit,
  videoLimit,
  aiLimit,
  aiDailyLimit,
  sortOrder,
  active,
}) {
  const supabase = getSupabase();
  const slugBase =
    slug && String(slug).trim()
      ? String(slug).trim().toLowerCase().replace(/\s+/g, "-")
      : slugify(name.trim());
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      name: name.trim(),
      slug: slugBase,
      price: price != null && Number.isFinite(Number(price)) ? Number(price) : 0,
      product_limit: productLimit,
      video_limit: videoLimit,
      ai_limit: aiLimit === "unlimited" || aiLimit === Infinity ? null : aiLimit,
      ai_daily_limit: (() => {
        if (
          aiDailyLimit === "none" ||
          aiDailyLimit === undefined ||
          aiDailyLimit === null ||
          aiDailyLimit === -1
        ) {
          return null;
        }
        const n = Number(aiDailyLimit);
        return Number.isFinite(n) && n >= 0 ? n : null;
      })(),
      is_system: false,
      sort_order: sortOrder ?? 10,
      active: active !== false,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function updatePlan(id, patch) {
  const row = await findById(id);
  if (!row) return null;
  if (row.is_system) {
    const forbidden = ["slug", "is_system"].filter((k) => patch[k] !== undefined);
    if (forbidden.length) {
      const err = new Error("Cannot change slug or system flag on built-in plans");
      err.code = "SYSTEM_PLAN";
      throw err;
    }
  }
  const supabase = getSupabase();
  const body = {};
  if (patch.name !== undefined) body.name = String(patch.name).trim();
  if (patch.slug !== undefined && !row.is_system) {
    body.slug = String(patch.slug).trim().toLowerCase().replace(/\s+/g, "-");
  }
  if (patch.product_limit !== undefined) body.product_limit = patch.product_limit;
  if (patch.video_limit !== undefined) body.video_limit = patch.video_limit;
  if (patch.ai_limit !== undefined) {
    body.ai_limit =
      patch.ai_limit === "unlimited" || patch.ai_limit === Infinity
        ? null
        : patch.ai_limit;
  }
  if (patch.ai_daily_limit !== undefined) {
    const v = patch.ai_daily_limit;
    body.ai_daily_limit =
      v === null || v === -1 || v === "none" ? null : Number(v);
  }
  if (patch.sort_order !== undefined) body.sort_order = patch.sort_order;
  if (patch.active !== undefined) body.active = !!patch.active;
  if (patch.price !== undefined) {
    const n = Number(patch.price);
    body.price = Number.isFinite(n) && n >= 0 ? n : 0;
  }
  if (Object.keys(body).length === 0) return row;
  const { data, error } = await supabase
    .from(TABLE)
    .update(body)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function deletePlan(id) {
  const row = await findById(id);
  if (!row) return false;
  if (row.is_system) {
    const err = new Error("Cannot delete built-in plan");
    err.code = "SYSTEM_PLAN";
    throw err;
  }
  const supabase = getSupabase();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) {
    error.code = error.code || "DELETE_FAILED";
    throw error;
  }
  return true;
}

module.exports = {
  findById,
  findBySlug,
  listAll,
  listUpgradeCatalog,
  createPlan,
  updatePlan,
  deletePlan,
};
