const { getSupabase } = require("../lib/supabase");

const TABLE = "affiliate_system_settings";
const ROW_ID = "default";

async function getSettings() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", ROW_ID)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    return {
      id: ROW_ID,
      commission_type: "percent",
      commission_value: 10,
      min_withdrawal: 5,
      first_n_bonus_stores: 5,
      first_n_bonus_extra_percent: 0,
    };
  }
  return data;
}

async function updateSettings(patch) {
  const supabase = getSupabase();
  const row = { ...patch, updated_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from(TABLE)
    .update(row)
    .eq("id", ROW_ID)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

module.exports = {
  getSettings,
  updateSettings,
};
