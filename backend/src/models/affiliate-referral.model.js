const { getSupabase } = require("../lib/supabase");

const TABLE = "affiliate_referrals";

async function createReferral({ affiliateId, storeId, status = "pending" }) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      affiliate_id: affiliateId,
      store_id: storeId,
      status,
    })
    .select("*")
    .single();
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

async function findByStoreId(storeId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("store_id", storeId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function updateReferral(id, patch) {
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

async function listByAffiliateId(affiliateId, limit = 200) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("affiliate_id", affiliateId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

async function countVerifiedByAffiliate(affiliateId) {
  const supabase = getSupabase();
  const { count, error } = await supabase
    .from(TABLE)
    .select("*", { count: "exact", head: true })
    .eq("affiliate_id", affiliateId)
    .eq("status", "verified");
  if (error) throw error;
  return count ?? 0;
}

module.exports = {
  createReferral,
  findById,
  findByStoreId,
  updateReferral,
  listByAffiliateId,
  countVerifiedByAffiliate,
};
