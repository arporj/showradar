import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/lib/auth.config";

// Uses the edge-safe config directly (not "@/lib/auth") so the proxy never
// pulls in argon2/postgres, which don't run on the Edge runtime.
const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ["/login", "/signup"];
const ONBOARDING_PATH = "/onboarding";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthed = !!req.auth?.user;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const isOnboardingPath = pathname.startsWith(ONBOARDING_PATH);

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
