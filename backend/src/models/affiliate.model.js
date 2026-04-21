const { getSupabase } = require("../lib/supabase");
const crypto = require("crypto");

const TABLE = "affiliates";

const REF_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

async function generateUniqueRefCode() {
  const supabase = getSupabase();
  for (let attempt = 0; attempt < 30; attempt += 1) {
    let code = "AFF";
    for (let i = 0; i < 8; i += 1) {
      code += REF_CHARS[crypto.randomInt(0, REF_CHARS.length)];
    }
    const { data, error } = await supabase
      .from(TABLE)
      .select("id")
      .eq("ref_code", code)
      .maybeSingle();
    if (error) throw error;
    if (!data) return code;
  }
  throw new Error("Could not allocate referral code");
}

async function createAffiliate({ name, email, phone, passwordHash }) {
  const supabase = getSupabase();
  const ref_code = await generateUniqueRefCode();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || null,
      password: passwordHash,
      ref_code,
    })
    .select("id, name, email, phone, ref_code, created_at")
    .single();
  if (error) throw error;
  return data;
}

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
    .select("id, name, email, phone, ref_code, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findByRefCode(refCode) {
  if (!refCode || typeof refCode !== "string") return null;
  const code = refCode.trim().toUpperCase();
  if (!code) return null;
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, name, email, phone, ref_code, created_at")
    .eq("ref_code", code)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findByIdWithPassword(id) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function listAll(limit = 300) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, name, email, phone, ref_code, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

module.exports = {
  createAffiliate,
  findByEmail,
  findById,
  findByRefCode,
  findByIdWithPassword,
  listAll,
};
