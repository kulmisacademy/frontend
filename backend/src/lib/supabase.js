const { createClient } = require("@supabase/supabase-js");
const { loadEnv } = require("../config/env");

let _client;

function getSupabase() {
  const { supabaseUrl, supabaseServiceKey } = loadEnv();
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase is not configured");
  }
  if (!_client) {
    _client = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

module.exports = { getSupabase };
