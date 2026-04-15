import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

function getSecret() {
  const s = process.env.JWT_SECRET?.trim();
  if (!s) return null;
  return new TextEncoder().encode(s);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const search = request.nextUrl.search;

  if (pathname.startsWith("/admin-secure-login")) {
    return NextResponse.next();
  }

  const secret = getSecret();
  if (!secret) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.startsWith("/admin") ? "/admin-secure-login" : "/login";
    url.searchParams.set("next", pathname + search);
    url.searchParams.set("error", "config");
    return NextResponse.redirect(url);
  }

  const redirectCustomerLogin = () => {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  };

  const redirectAdminLogin = () => {
    const url = request.nextUrl.clone();
    url.pathname = "/admin-secure-login";
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  };

  if (pathname.startsWith("/admin")) {
    const adminSessionToken = request.cookies.get("laas24_admin_token")?.value;
    if (!adminSessionToken) {
      return redirectAdminLogin();
    }
    try {
      const { payload } = await jwtVerify(adminSessionToken, secret);
      if (payload.role !== "admin") {
        return redirectAdminLogin();
      }
      return NextResponse.next();
    } catch {
      return redirectAdminLogin();
    }
  }

  const customerSessionToken = request.cookies.get("laas24_token")?.value;
  if (!customerSessionToken) {
    return redirectCustomerLogin();
  }

  try {
    const { payload } = await jwtVerify(customerSessionToken, secret);
    const role = payload.role as string;

    if (pathname.startsWith("/dashboard")) {
      if (role !== "vendor") {
        const url = request.nextUrl.clone();
        url.pathname = role === "admin" ? "/admin" : "/profile";
        url.search = "";
        return NextResponse.redirect(url);
      }
    }

    if (pathname.startsWith("/profile") || pathname.startsWith("/account")) {
      if (role !== "customer") {
        const url = request.nextUrl.clone();
        url.pathname = role === "vendor" ? "/dashboard" : "/admin";
        url.search = "";
        return NextResponse.redirect(url);
      }
    }

    if (pathname.startsWith("/checkout")) {
      if (role === "admin") {
        const url = request.nextUrl.clone();
        url.pathname = "/admin";
        url.search = "";
        return NextResponse.redirect(url);
      }
    }

    return NextResponse.next();
  } catch {
    return redirectCustomerLogin();
  }
}

export const config = {
  matcher: [
    "/admin-secure-login",
    "/admin/:path*",
    "/profile/:path*",
    "/account/:path*",
    "/dashboard/:path*",
    "/checkout",
    "/checkout/:path*",
  ],
};
