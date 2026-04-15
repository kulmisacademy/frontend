const { getSupabase } = require("../lib/supabase");

const TABLE = "subscription_requests";

async function createRow({
  storeId,
  requestType,
  targetPlanId,
  durationMonths,
  contactPhone,
  notes,
  /** @deprecated optional legacy column */
  planRequested,
}) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      store_id: storeId,
      request_type: requestType || "plan",
      target_plan_id: targetPlanId ?? null,
      duration_months:
        durationMonths != null && Number(durationMonths) > 0
          ? Number(durationMonths)
          : 1,
      contact_phone: contactPhone.trim(),
      notes: notes?.trim() || null,
      plan_requested: planRequested ?? null,
      status: "pending",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function findPendingByStoreId(storeId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("id")
    .eq("store_id", storeId)
    .eq("status", "pending")
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

async function listAllForAdmin(limit = 200) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

async function resolveRequest(id, status, resolvedByUserId) {
  const existing = await findById(id);
  if (!existing || existing.status !== "pending") return null;
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status,
      resolved_at: new Date().toISOString(),
      resolved_by_user_id: resolvedByUserId,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

module.exports = {
  createRow,
  findPendingByStoreId,
  findById,
  listAllForAdmin,
  resolveRequest,
};
