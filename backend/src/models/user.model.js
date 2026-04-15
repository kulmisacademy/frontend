const { getSupabase } = require("../lib/supabase");

const TABLE = "users";

async function findByEmail(email) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findById(id) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, name, email, role, phone, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findByIds(ids) {
  if (!ids || ids.length === 0) return [];
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, name, email, role, phone, created_at")
    .in("id", ids);
  if (error) throw error;
  return data || [];
}

async function createUser({ name, email, phone, passwordHash, role }) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || null,
      password: passwordHash,
      role,
    })
    .select("id, name, email, role, phone, created_at")
    .single();
  if (error) throw error;
  return data;
}

async function updatePassword(userId, passwordHash) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from(TABLE)
    .update({ password: passwordHash })
    .eq("id", userId);
  if (error) throw error;
}

async function listAll(limit = 200) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, name, email, role, phone, created_at")
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

module.exports = {
  findByEmail,
  findById,
  findByIds,
  createUser,
  updatePassword,
  listAll,
  countRows,
};
