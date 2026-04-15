const { getSupabase } = require("../lib/supabase");

const TABLE = "store_ratings";

async function createRating(row) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function findByOrderId(orderId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function orderIdsRated(orderIds) {
  if (!orderIds.length) return new Set();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("order_id")
    .in("order_id", orderIds);
  if (error) throw error;
  return new Set((data || []).map((r) => r.order_id));
}

async function listByStoreId(storeId, limit = 30) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, rating, feedback, created_at, customer_id")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

async function aggregateForStore(storeId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("rating")
    .eq("store_id", storeId);
  if (error) throw error;
  const rows = data || [];
  if (rows.length === 0) return { average: null, count: 0 };
  const sum = rows.reduce((acc, r) => acc + Number(r.rating), 0);
  return { average: sum / rows.length, count: rows.length };
}

module.exports = {
  createRating,
  findByOrderId,
  orderIdsRated,
  listByStoreId,
  aggregateForStore,
};
