import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/lib/auth.config";

// Uses the edge-safe config directly (not "@/lib/auth") so the proxy never
// pulls in argon2/postgres, which don't run on the Edge runtime.
const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ["/login", "/signup"];
// Unlike PUBLIC_PATHS, these must stay reachable regardless of auth state —
// a user can request a password reset while logged out on one device but
// still be logged in on another, and clicking the emailed link there must
// not get bounced to /dashboard by the "already authenticated" redirect below.
const ALWAYS_ACCESSIBLE_PATHS = ["/forgot-password", "/reset-password"];
const ONBOARDING_PATH = "/onboarding";
const ADMIN_PATH = "/admin";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthed = !!req.auth?.user;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const isAlwaysAccessible = ALWAYS_ACCESSIBLE_PATHS.some((path) => pathname.startsWith(path));
  const isOnboardingPath = pathname.startsWith(ONBOARDING_PATH);

  if (isAlwaysAccessible) return NextResponse.next();

  if (!isAuthed) {
    if (isPublicPath || pathname === "/") return NextResponse.next();
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const needsUsername = !req.auth?.user.username;

  if (needsUsername && !isOnboardingPath) {
    return NextResponse.redirect(new URL(ONBOARDING_PATH, req.nextUrl));
  }

  if (pathname.startsWith(ADMIN_PATH) && req.auth?.user.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  if (!needsUsername && (isPublicPath || isOnboardingPath)) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // Excludes anything with a file extension in its last path segment (static
  // assets: favicon.ico, manifest.webmanifest, sw.js, icon.svg,
  // apple-icon.png, everything under /icons/, /tmdb-logo.svg, etc.) instead
  // of naming each one — no real page route in this app ever has a dot in
  // its last segment (usernames/ids are all dot-free), so this can't
  // accidentally swallow a real route.
  matcher: ["/((?!api|_next/static|_next/image|.*\\.\\w+$).*)"],
};
