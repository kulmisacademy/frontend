const crypto = require("crypto");
const { getSupabase } = require("../lib/supabase");

const TABLE = "password_resets";

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function createResetRecord(userId) {
  const supabase = getSupabase();
  const token = crypto.randomBytes(32).toString("hex");
  const token_hash = hashToken(token);
  const expires_at = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  await supabase.from(TABLE).delete().eq("user_id", userId);

  const { error } = await supabase.from(TABLE).insert({
    user_id: userId,
    token_hash,
    expires_at,
  });
  if (error) throw error;
  return { token, expires_at };
}

async function findUserIdByToken(token) {
  const supabase = getSupabase();
  const token_hash = hashToken(token);
  const { data, error } = await supabase
    .from(TABLE)
    .select("user_id, expires_at")
    .eq("token_hash", token_hash)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (new Date(data.expires_at) < new Date()) return null;
  return data.user_id;
}

async function deleteByUserId(userId) {
  const supabase = getSupabase();
  await supabase.from(TABLE).delete().eq("user_id", userId);
}

module.exports = {
  createResetRecord,
  findUserIdByToken,
  deleteByUserId,
};
