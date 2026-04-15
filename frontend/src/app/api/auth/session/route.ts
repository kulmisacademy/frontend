import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

function getSecret() {
  const s = process.env.JWT_SECRET?.trim();
  if (!s) {
    throw new Error("JWT_SECRET is not configured");
  }
  return new TextEncoder().encode(s);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = typeof body.token === "string" ? body.token : "";
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }
    await jwtVerify(token, getSecret());
    const res = NextResponse.json({ ok: true });
    res.cookies.set("laas24_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid token" },
      { status: 401 }
    );
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("laas24_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
