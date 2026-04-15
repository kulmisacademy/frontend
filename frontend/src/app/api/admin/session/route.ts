import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getApiBaseUrl } from "@/lib/api";

function getSecret() {
  const s = process.env.JWT_SECRET?.trim();
  if (!s) {
    throw new Error("JWT_SECRET is not configured");
  }
  return new TextEncoder().encode(s);
}

const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 2;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password) {
      return NextResponse.json(
        { error: "Missing email or password" },
        { status: 400 }
      );
    }

    const upstream = await fetch(`${getApiBaseUrl()}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(25_000),
    });
    const text = await upstream.text();
    const data = text
      ? (JSON.parse(text) as {
          token?: string;
          user?: unknown;
          error?: unknown;
        })
      : {};

    if (!upstream.ok) {
      return NextResponse.json(data, { status: upstream.status });
    }
    if (!data.token || typeof data.token !== "string") {
      return NextResponse.json(
        { error: "Invalid login response from API" },
        { status: 502 }
      );
    }

    const { payload } = await jwtVerify(data.token, getSecret());
    if (payload.role !== "admin") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const res = NextResponse.json({ user: data.user });
    res.cookies.set("laas24_admin_token", data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ADMIN_COOKIE_MAX_AGE,
    });
    return res;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Session failed" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("laas24_admin_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
