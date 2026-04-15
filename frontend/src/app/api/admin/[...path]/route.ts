import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getApiBaseUrl } from "@/lib/api";

function getSecret() {
  const s = process.env.JWT_SECRET?.trim();
  if (!s) return null;
  return new TextEncoder().encode(s);
}

async function getAdminBearer(req: NextRequest): Promise<string | null> {
  const secret = getSecret();
  if (!secret) return null;
  const token = req.cookies.get("laas24_admin_token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.role !== "admin") return null;
    return token;
  } catch {
    return null;
  }
}

async function proxy(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const bearer = await getAdminBearer(req);
  if (!bearer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { path } = await ctx.params;
  const suffix = path?.length ? path.join("/") : "";
  const base = getApiBaseUrl().replace(/\/$/, "");
  const u = new URL(req.url);
  const qs = u.searchParams.toString();
  const target = `${base}/api/admin/${suffix}${qs ? `?${qs}` : ""}`;

  const body =
    req.method === "GET" || req.method === "HEAD"
      ? undefined
      : await req.arrayBuffer();

  const upstream = await fetch(target, {
    method: req.method,
    headers: {
      Authorization: `Bearer ${bearer}`,
      ...(req.headers.get("content-type")
        ? { "content-type": req.headers.get("content-type")! }
        : {}),
    },
    body: body && body.byteLength > 0 ? Buffer.from(body) : undefined,
    signal: AbortSignal.timeout(120_000),
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") ?? "application/json",
    },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
