const { getSupabase } = require("../lib/supabase");

const TABLE = "store_follows";

async function follow(customerId, storeId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ customer_id: customerId, store_id: storeId })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function unfollow(customerId, storeId) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("customer_id", customerId)
    .eq("store_id", storeId);
  if (error) throw error;
}

async function isFollowing(customerId, storeId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("id")
    .eq("customer_id", customerId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

async function listStoresForCustomer(customerId, limit = 200) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("store_id, created_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

module.exports = {
  follow,
  unfollow,
  isFollowing,
  listStoresForCustomer,
};
