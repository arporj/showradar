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

  if (!needsUsername && (isPublicPath || isOnboardingPath)) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js).*)"],
};
