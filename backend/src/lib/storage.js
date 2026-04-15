const { getSupabase } = require("./supabase");
const { loadEnv } = require("../config/env");
const { withNetworkRetries } = require("./retry-network");

async function uploadBuffer({ bucket, path, buffer, contentType }) {
  const supabase = getSupabase();
  const { storageBucket } = loadEnv();
  const b = bucket || storageBucket;
  await withNetworkRetries(async () => {
    const { error } = await supabase.storage.from(b).upload(path, buffer, {
      contentType: contentType || "application/octet-stream",
      upsert: true,
    });
    if (error) throw error;
  });
  const {
    data: { publicUrl },
  } = supabase.storage.from(b).getPublicUrl(path);
  return publicUrl;
}

module.exports = { uploadBuffer };
