const { getSupabase } = require("../lib/supabase");

const TABLE = "affiliate_commissions";

async function insertCommission(row) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function findBySubscriptionRequestId(subscriptionRequestId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("subscription_request_id", subscriptionRequestId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function listByAffiliate(affiliateId, limit = 200) {
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

async function updateById(id, patch) {
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

async function updateManyByIds(ids, patch) {
  if (!ids.length) return;
  const supabase = getSupabase();
  const { error } = await supabase.from(TABLE).update(patch).in("id", ids);
  if (error) throw error;
}

async function sumByAffiliateAndStatus(affiliateId, status) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("amount")
    .eq("affiliate_id", affiliateId)
    .eq("status", status);
  if (error) throw error;
  const rows = data || [];
  return rows.reduce((s, r) => s + Number(r.amount || 0), 0);
}

async function listVerifiedFifo(affiliateId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("affiliate_id", affiliateId)
    .eq("status", "verified")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function listByWithdrawalId(withdrawalId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("withdrawal_id", withdrawalId);
  if (error) throw error;
  return data || [];
}

async function listPendingByStoreId(storeId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("store_id", storeId)
    .eq("status", "pending");
  if (error) throw error;
  return data || [];
}

async function deletePendingForStore(storeId) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("store_id", storeId)
    .eq("status", "pending");
  if (error) throw error;
}

module.exports = {
  insertCommission,
  findBySubscriptionRequestId,
  listByAffiliate,
  updateById,
  updateManyByIds,
  sumByAffiliateAndStatus,
  listVerifiedFifo,
  listByWithdrawalId,
  listPendingByStoreId,
  deletePendingForStore,
};
