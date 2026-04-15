import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

function getSecret() {
  const s = process.env.JWT_SECRET?.trim();
  if (!s) return null;
  return new TextEncoder().encode(s);
}

export async function GET(req: NextRequest) {
  const secret = getSecret();
  if (!secret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }
  const token = req.cookies.get("laas24_admin_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({
      user: {
        id: String(payload.sub),
        email: payload.email as string,
        role: payload.role as string,
        name:
          (typeof payload.name === "string" && payload.name) ||
          String(payload.email || "").split("@")[0] ||
          "Admin",
        phone: null as string | null,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }
}
