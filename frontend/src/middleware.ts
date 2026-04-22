import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

function getSecret() {
  const s = process.env.JWT_SECRET?.trim();
  if (!s) return null;
  return new TextEncoder().encode(s);
}

function splitLocale(pathname: string): { locale: string; stripped: string } {
  for (const loc of routing.locales) {
    const prefix = `/${loc}`;
    if (pathname === prefix) return { locale: loc, stripped: "/" };
    if (pathname.startsWith(`${prefix}/`)) {
      return { locale: loc, stripped: pathname.slice(prefix.length) };
    }
  }
  return { locale: routing.defaultLocale, stripped: pathname };
}

export async function middleware(request: NextRequest) {
  const intlResponse = intlMiddleware(request);
  if (intlResponse.status === 307 || intlResponse.status === 308) {
    return intlResponse;
  }

  const pathname = request.nextUrl.pathname;
  const search = request.nextUrl.search;
  const { locale, stripped } = splitLocale(pathname);
  const nextReturnTarget = `${stripped}${search}`;

  if (stripped.startsWith("/admin-secure-login")) {
    return intlResponse;
  }

  const needsAuth =
    stripped.startsWith("/admin") ||
    stripped.startsWith("/profile") ||
    stripped.startsWith("/account") ||
    stripped.startsWith("/dashboard") ||
    stripped.startsWith("/checkout");

  if (!needsAuth) {
    return intlResponse;
  }

  const secret = getSecret();
  if (!secret) {
    const url = request.nextUrl.clone();
    url.pathname = stripped.startsWith("/admin")
      ? `/${locale}/admin-secure-login`
      : `/${locale}/login`;
    url.searchParams.set("next", nextReturnTarget);
    url.searchParams.set("error", "config");
    return NextResponse.redirect(url);
  }

  const redirectCustomerLogin = () => {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.searchParams.set("next", nextReturnTarget);
    return NextResponse.redirect(url);
  };

  const redirectAdminLogin = () => {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/admin-secure-login`;
    url.searchParams.set("next", nextReturnTarget);
    return NextResponse.redirect(url);
  };

  if (stripped.startsWith("/admin")) {
    const adminSessionToken = request.cookies.get("laas24_admin_token")?.value;
    if (!adminSessionToken) {
      return redirectAdminLogin();
    }
    try {
      const { payload } = await jwtVerify(adminSessionToken, secret);
      if (payload.role !== "admin") {
        return redirectAdminLogin();
      }
      return intlResponse;
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

    if (stripped.startsWith("/dashboard")) {
      if (role !== "vendor") {
        const url = request.nextUrl.clone();
        url.pathname =
          role === "admin" ? `/${locale}/admin` : `/${locale}/profile`;
        url.search = "";
        return NextResponse.redirect(url);
      }
    }

    if (stripped.startsWith("/profile") || stripped.startsWith("/account")) {
      if (role !== "customer") {
        const url = request.nextUrl.clone();
        url.pathname =
          role === "vendor" ? `/${locale}/dashboard` : `/${locale}/admin`;
        url.search = "";
        return NextResponse.redirect(url);
      }
    }

    if (stripped.startsWith("/checkout")) {
      if (role === "admin") {
        const url = request.nextUrl.clone();
        url.pathname = `/${locale}/admin`;
        url.search = "";
        return NextResponse.redirect(url);
      }
    }

    return intlResponse;
  } catch {
    return redirectCustomerLogin();
  }
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
