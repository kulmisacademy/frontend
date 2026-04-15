const express = require("express");
const compression = require("compression");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { loadEnv } = require("./config/env");
const authRoutes = require("./routes/auth.routes");
const publicStoreRoutes = require("./routes/public.routes");
const catalogRoutes = require("./routes/catalog.routes");
const vendorRoutes = require("./routes/vendor.routes");
const adminRoutes = require("./routes/admin.routes");
const adminAuthController = require("./controllers/admin-auth.controller");
const { adminIpAllowlist } = require("./middleware/admin-ip.middleware");
const aiRoutes = require("./routes/ai.routes");
const { requireAuth, requireRole } = require("./middleware/auth.middleware");

const env = loadEnv();
const { port, frontendUrl } = env;
if (
  !String(env.jwtSecret || "").trim() ||
  !String(env.supabaseUrl || "").trim() ||
  !String(env.supabaseServiceKey || "").trim()
) {
  console.warn(
    "[laas24-api] JWT_SECRET or Supabase keys are missing/empty in backend/.env.local — vendor registration and login will fail until fixed."
  );
}

/**
 * Origins allowed for CORS (Vercel production, previews, local dev).
 * Set FRONTEND_URL to your canonical site (e.g. https://laas24.com).
 * Optional CORS_ORIGINS=comma-separated extra origins (preview URLs, staging).
 * CORS_ALLOW_VERCEL_PREVIEWS=true allows any https://*.vercel.app (use for PR previews only).
 */
function buildAllowedCorsOrigins() {
  const set = new Set();
  const add = (u) => {
    if (!u || typeof u !== "string") return;
    const n = u.trim().replace(/\/$/, "");
    if (n) set.add(n);
  };
  add(frontendUrl);
  const extra = process.env.CORS_ORIGINS || "";
  for (const part of extra.split(",")) {
    add(part);
  }
  const base = frontendUrl.replace(/\/$/, "");
  if (base.includes("localhost")) {
    add(base.replace("localhost", "127.0.0.1"));
  } else if (base.includes("127.0.0.1")) {
    add(base.replace("127.0.0.1", "localhost"));
  }
  return set;
}

const allowedCorsOrigins = buildAllowedCorsOrigins();
const allowVercelPreviewOrigins =
  String(process.env.CORS_ALLOW_VERCEL_PREVIEWS || "").toLowerCase() === "true";

if (process.env.NODE_ENV === "production") {
  console.log(
    `[laas24-api] CORS: ${allowedCorsOrigins.size} origin(s); vercel previews: ${allowVercelPreviewOrigins}`
  );
}

const app = express();

app.set("trust proxy", 1);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }
      if (allowedCorsOrigins.has(origin)) {
        return callback(null, true);
      }
      if (
        allowVercelPreviewOrigins &&
        /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)
      ) {
        return callback(null, true);
      }
      console.warn(`[laas24-api] CORS blocked origin: ${origin}`);
      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(compression());
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.type("html").send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>LAAS24 API</title></head>
<body style="font-family:system-ui,sans-serif;max-width:36rem;margin:2rem auto;padding:0 1rem">
  <h1>LAAS24 API</h1>
  <p>This is the backend (JSON). The website runs on the Next.js app.</p>
  <ul>
    <li><a href="/health">GET /health</a> — liveness</li>
    <li><a href="/health/db">GET /health/db</a> — database check</li>
    <li>REST routes under <code>/api/…</code> (catalog, auth, vendor, …)</li>
  </ul>
  <p>Open the storefront: <a href="${frontendUrl.replace(/\/$/, "") || "http://localhost:3000"}">${frontendUrl.replace(/\/$/, "") || "http://localhost:3000"}</a></p>
</body></html>`);
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth", authLimiter);
app.use("/api/auth", authRoutes);

const catalogPublicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 800,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/stores", catalogPublicLimiter, publicStoreRoutes);
app.use("/api/catalog", catalogPublicLimiter, catalogRoutes);

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/ai", aiLimiter, requireAuth, requireRole("vendor"), aiRoutes);

app.use("/api/vendor", requireAuth, requireRole("vendor"), vendorRoutes);

const adminLoginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many admin login attempts. Try again in a minute." },
});

app.post(
  "/api/admin/login",
  adminLoginLimiter,
  adminIpAllowlist,
  adminAuthController.login
);

app.use("/api/admin", requireAuth, requireRole("admin"), adminRoutes);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "laas24-backend" });
});

/** Database connectivity (Supabase). Open http://localhost:4000/health/db while the API runs. */
app.get("/health/db", async (_req, res) => {
  const missing = [];
  if (!String(env.supabaseUrl || "").trim()) missing.push("SUPABASE_URL");
  if (!String(env.supabaseServiceKey || "").trim()) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }
  if (missing.length) {
    return res.status(503).json({
      ok: false,
      database: "not_configured",
      missing,
      message:
        "Add the missing variables to backend/.env.local (use the service_role key from Supabase → Settings → API), restart the API, and try again.",
    });
  }

  try {
    const { getSupabase } = require("./lib/supabase");
    const supabase = getSupabase();
    const { error } = await supabase.from("users").select("id").limit(1);
    if (error) {
      const missingTable =
        error.code === "PGRST205" ||
        /Could not find the table|schema cache/i.test(error.message);
      return res.status(503).json({
        ok: false,
        database: "query_failed",
        message: error.message,
        code: error.code ?? null,
        hint: missingTable
          ? "Run backend/supabase/RUN_ALL.sql in the Supabase SQL Editor (creates users, stores, etc.)."
          : error.hint || null,
      });
    }
    return res.json({
      ok: true,
      database: "connected",
      supabase: "users table reachable",
    });
  } catch (e) {
    return res.status(503).json({
      ok: false,
      database: "error",
      message: e?.message || String(e),
    });
  }
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  const status =
    err && typeof err.status === "number" && err.status >= 400 && err.status < 600
      ? err.status
      : err && typeof err.statusCode === "number"
        ? err.statusCode
        : 500;
  const message =
    (err && typeof err.message === "string" && err.message) ||
    (typeof err === "string" ? err : null) ||
    "Internal server error";
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== "production" &&
      err &&
      typeof err === "object" && {
        code: err.code,
        details: err.details,
        hint: err.hint,
      }),
  });
});

const server = app.listen(port, () => {
  console.log(`LAAS24 API listening on http://localhost:${port}`);
});

server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    console.error(
      `[laas24-api] Port ${port} is already in use. Stop the other LAAS24 API (or root "npm run dev"), then try again. Optional: set PORT=4001 in backend/.env.local`
    );
    process.exit(1);
  }
  throw err;
});
