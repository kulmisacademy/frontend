# LAAS24 production deployment (Vercel + Railway)

Separated **Next.js frontend** and **Express backend**. The browser calls the API using `NEXT_PUBLIC_API_URL` (no same-origin proxy required).

## 1. Backend (Railway)

### Repository

- **Root directory / service folder:** `backend/` (or deploy only the `backend` folder as its own repo).

### Start command

- **Start:** `npm start` (runs `node src/index.js`).
- **Node:** >= 20 (see `backend/package.json` `engines`).

### Environment variables (Railway → Variables)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Auto | Railway sets this; do **not** override unless you know why. |
| `FRONTEND_URL` | **Yes** | Canonical site URL **with** `https`, no trailing slash, e.g. `https://your-app.vercel.app` or `https://laas24.com`. Used for CORS, password-reset links, and the API home page link. |
| `JWT_SECRET` | **Yes** | Long random string. **Must match** the frontend `JWT_SECRET` exactly. |
| `JWT_EXPIRES_IN` | No | Default `7d`. |
| `SUPABASE_URL` | **Yes** | Same project as Supabase dashboard. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | **Service role** key (server only; never expose to the client). |
| `SUPABASE_STORAGE_BUCKET` | No | Default `store-logos`. |
| `CORS_ORIGINS` | No | Comma-separated **extra** allowed origins (e.g. alternate domain, old URL). Primary origin is always `FRONTEND_URL`. |
| `CORS_ALLOW_VERCEL_PREVIEWS` | No | Set to `true` only if you want to allow **any** `https://*.vercel.app` origin (PR previews). Leave unset/false for stricter production. |
| `OPENAI_API_KEY` | No | For AI product generation. |
| SMTP vars | No | See `backend/.env.example` for password reset emails. |

### Health checks

- Railway HTTP health check path: `/health` (and optionally `/health/db` for DB).
- `backend/railway.toml` configures the deploy health check to use `/health` (100s timeout).

### Custom domain

- Attach your API domain in Railway and use that URL as `NEXT_PUBLIC_API_URL` on Vercel.

---

## 2. Frontend (Vercel)

### Repository

- **Root directory:** `frontend/` (or monorepo with “Root Directory” = `frontend`).

### Environment variables (Vercel → Settings → Environment Variables)

Apply to **Production** (and **Preview** if you use preview deployments).

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | **Yes** | Public API base URL, **no** trailing slash, e.g. `https://your-api.up.railway.app`. All `apiFetch` calls use this. |
| `NEXT_PUBLIC_SITE_URL` | **Yes** (prod) | Same as the public site URL (`https://your-domain.com`). Used for product links, WhatsApp URLs, metadata. If unset in production, some fallbacks assume `https://laas24.com` — set this to your real domain. |
| `JWT_SECRET` | **Yes** | **Same value as backend** `JWT_SECRET` (middleware / session). |
| `NEXT_PUBLIC_SUPABASE_URL` | If used | Browser-safe Supabase URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | If used | Anon/publishable key only. |

### Preview deployments (PRs)

- Each preview has a URL like `https://<project>-<hash>.vercel.app`.
- **Option A:** Add that URL to Railway `CORS_ORIGINS` (comma-separated) when testing a specific preview (updates per PR).
- **Option B:** Set Railway `CORS_ALLOW_VERCEL_PREVIEWS=true` (looser; only if acceptable for your threat model).

### Build

- Default: `npm run build` in `frontend/`.

---

## 3. Post-deploy checks

1. **API:** Open `https://<your-api>/health` → `{ "ok": true, ... }`.
2. **DB:** Open `https://<your-api>/health/db` → `database: "connected"` (with service role configured).
3. **CORS:** From the live site, sign in and open DevTools → Network; API responses should not be blocked by CORS.
4. **Auth:** Register/login, vendor dashboard, admin (if applicable).
5. **Password reset:** `FRONTEND_URL` on the API must match the URL users use so email links land on your Vercel app.

---

## 4. Security reminders

- Never commit `.env.local` or Railway/Vercel secrets.
- Rotate keys if they leak.
- Use **HTTPS** everywhere in production URLs.
- `SUPABASE_SERVICE_ROLE_KEY` only on the **backend**.
