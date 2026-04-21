const { getSupabase } = require("../lib/supabase");

const TABLE = "affiliate_withdrawals";

async function createWithdrawal(row) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .insert(row)
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

async function listByAffiliate(affiliateId, limit = 100) {
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

async function listAllForAdmin(status, limit = 200) {
  const supabase = getSupabase();
  let q = supabase.from(TABLE).select("*").order("created_at", { ascending: false });
  if (status && status !== "all") {
    q = q.eq("status", status);
  }
  const { data, error } = await q.limit(limit);
  if (error) throw error;
  return data || [];
}

async function updateWithdrawal(id, patch) {
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

async function hasPendingForAffiliate(affiliateId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("id")
    .eq("affiliate_id", affiliateId)
    .in("status", ["pending", "approved"])
    .limit(1);
  if (error) throw error;
  return (data || []).length > 0;
}

module.exports = {
  createWithdrawal,
  findById,
  listByAffiliate,
  listAllForAdmin,
  updateWithdrawal,
  hasPendingForAffiliate,
};
