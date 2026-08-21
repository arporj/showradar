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
// "/opengraph-image" (rota dinâmica do opengraph-image.tsx, sem extensão no
// path — a exclusão por extensão do matcher não a cobre) precisa ficar aqui:
// crawlers de link preview (WhatsApp/Facebook/Twitter) não têm sessão e
// receberiam um redirect pra /login no lugar da imagem.
// "/l/" é a primeira rota genuinamente pública do produto (listas públicas
// ou "unlisted", pra SEO/compartilhamento — ver PROGRESS.md) — o proxy só
// libera o acesso; a própria página consulta o banco e decide se quem
// pediu pode ver aquela lista específica (dono vê sempre, senão depende de
// visibility).
const ALWAYS_ACCESSIBLE_PATHS = [
  "/forgot-password",
  "/reset-password",
  "/privacidade",
  "/termos",
  "/opengraph-image",
  "/l/",
];
const ONBOARDING_PATH = "/onboarding";
const ADMIN_PATH = "/admin";

// A página de um título é compartilhável por link externo, então precisa
// abrir sem sessão. O casamento é exato de propósito: um `startsWith`
// liberaria junto `/title/tv/123/comments` e as páginas de episódio, que
// continuam sendo só para quem tem conta. Quem visita anônimo vê a página
// inteira, mas os botões de ação levam para o cadastro — ver (shared)/layout.tsx.
const PUBLIC_TITLE_PATH = /^\/title\/(movie|tv)\/\d+$/;

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthed = !!req.auth?.user;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const isAlwaysAccessible =
    ALWAYS_ACCESSIBLE_PATHS.some((path) => pathname.startsWith(path)) || PUBLIC_TITLE_PATH.test(pathname);
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

  // "/" incluído: logado, a landing (que só oferece "Criar conta"/"Entrar")
  // não faz sentido — segue direto pro dashboard.
  if (!needsUsername && (isPublicPath || isOnboardingPath || pathname === "/")) {
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
