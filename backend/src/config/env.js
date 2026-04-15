const path = require("path");
const root = path.join(__dirname, "../..");
require("dotenv").config({ path: path.join(root, ".env") });
require("dotenv").config({ path: path.join(root, ".env.local"), override: true });

const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "JWT_SECRET"];

function loadEnv() {
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.warn(
      `[laas24-backend] Missing env: ${missing.join(", ")} — auth routes will fail until set.`
    );
  }
  return {
    port: Number(process.env.PORT) || 4000,
    frontendUrl: (process.env.FRONTEND_URL || "http://localhost:3000").replace(
      /\/$/,
      ""
    ),
    jwtSecret: (process.env.JWT_SECRET || "").trim(),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
    /** Shorter TTL for tokens issued by POST /api/admin/login (e.g. 2h, 120m). */
    adminJwtExpiresIn: (process.env.ADMIN_JWT_EXPIRES_IN || "2h").trim(),
    supabaseUrl: (process.env.SUPABASE_URL || "").trim(),
    supabaseServiceKey: (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim(),
    storageBucket: process.env.SUPABASE_STORAGE_BUCKET || "store-logos",
    /** Optional: OpenAI Vision for /api/ai/generate-product */
    openaiApiKey: (process.env.OPENAI_API_KEY || "").trim(),
    smtp: {
      host: (process.env.SMTP_HOST || "").trim(),
      port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
      user: (process.env.SMTP_USER || "").trim(),
      pass: (process.env.SMTP_PASS || "").trim(),
      /** Display name + email, e.g. `LAAS 24/7 <name@gmail.com>` */
      from: (
        process.env.EMAIL_FROM ||
        process.env.SMTP_FROM ||
        "noreply@laas24.local"
      )
        .trim()
        .replace(/^["']|["']$/g, ""),
    },
  };
}

module.exports = { loadEnv };
