import { NextRequest, NextResponse } from "next/server";

// A Server Component (e.g. the (app) layout) can detect that a session is no
// longer valid (user deleted, sessionVersion bumped) but cannot clear the
// cookie itself — only a Route Handler or Middleware can mutate cookies.
// Without this, a stale-but-still-decodable JWT keeps looking "authenticated"
// to the edge proxy forever, bouncing between /login and the protected page.
export async function GET(req: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", req.url));
  for (const cookie of req.cookies.getAll()) {
    if (cookie.name.includes("authjs.session-token")) {
      response.cookies.delete(cookie.name);
    }
  }
  return response;
}
