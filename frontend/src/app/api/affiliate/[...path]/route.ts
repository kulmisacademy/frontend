import { NextRequest, NextResponse } from "next/server";
import { getUpstreamApiBaseUrl } from "@/lib/api";

/**
 * Proxies authenticated affiliate dashboard routes to Express using the
 * caller's Authorization header (affiliate JWT).
 */
async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const suffix = path?.length ? path.join("/") : "";
  const base = getUpstreamApiBaseUrl();
  const u = new URL(req.url);
  const qs = u.searchParams.toString();
  const target = `${base}/api/affiliate/${suffix}${qs ? `?${qs}` : ""}`;

  const body =
    req.method === "GET" || req.method === "HEAD"
      ? undefined
      : await req.arrayBuffer();

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const contentType = req.headers.get("content-type");

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers: {
        Authorization: auth,
        ...(contentType ? { "content-type": contentType } : {}),
      },
      body: body && body.byteLength > 0 ? Buffer.from(body) : undefined,
      signal: AbortSignal.timeout(120_000),
    });

    const status = upstream.status;
    if (status === 204 || status === 304 || req.method === "HEAD") {
      const headers = new Headers();
      for (const name of ["etag", "cache-control", "last-modified", "content-type"]) {
        const v = upstream.headers.get(name);
        if (v) headers.set(name, v);
      }
      return new NextResponse(null, { status, headers });
    }

    const text = await upstream.text();
    return new NextResponse(text, {
      status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        error: "Affiliate API proxy could not reach the backend API",
        detail: msg,
        target: process.env.NODE_ENV !== "production" ? target : undefined,
      },
      { status: 502 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
