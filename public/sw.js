// Service worker for Web Push, PWA installability, and (Fase 12) offline
// viewing of /dashboard and /library. Deliberately still NOT a general
// offline-first cache — this app is data-heavy (TMDb/library state changes
// constantly) — everything except the two routes below stays network-first
// passthrough with no cache fallback, same as before.

// Bump on caching-*strategy* changes only (not every deploy — hashed
// /_next/static filenames already self-invalidate by name). Mirrored in
// src/lib/offline/page-cache.ts — keep the two in sync.
const PAGE_CACHE_NAME = "showradar-pages-v1";
const STATIC_CACHE_NAME = "showradar-static-v1";
const CACHE_ALLOWLIST = [PAGE_CACHE_NAME, STATIC_CACHE_NAME];
const OFFLINE_PAGES = ["/dashboard", "/library"];
// Mirrored in src/lib/offline/background-sync.ts — keep the two in sync.
const SYNC_TAG = "showradar-mutation-queue";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => name.startsWith("showradar-") && !CACHE_ALLOWLIST.includes(name)).map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    event.respondWith(fetch(request)); // never touch Server Action POSTs, API routes, or cross-origin (TMDb) requests
    return;
  }

  // Full browser navigations only — NOT the RSC/prefetch fetches Next's
  // client router issues for same-tab <Link> transitions (different request
  // mode), which still pass straight through unchanged.
  if (request.mode === "navigate" && OFFLINE_PAGES.includes(url.pathname)) {
    event.respondWith(networkFirstWithCache(request, PAGE_CACHE_NAME));
    return;
  }

  // Content-hashed, immutable build output — required for a cached
  // /dashboard or /library document to actually hydrate/render styled
  // instead of showing broken raw HTML offline.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE_NAME));
    return;
  }

  event.respondWith(fetch(request)); // unchanged passthrough for everything else
});

async function networkFirstWithCache(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    // response.redirected guards against caching a 200 login page under the
    // /dashboard key when a session has expired mid-navigation (proxy.ts
    // redirects unauthenticated requests to /login; fetch() follows
    // redirects transparently, so response.ok alone isn't enough here).
    if (response.ok && !response.redirected) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

// Best-effort wake-up for the mutation queue that lives entirely in the page
// (src/lib/offline/*) — this SW never calls a Server Action itself.
// Reimplementing Next's action POST protocol (including the build-scoped
// Next-Action header) here would be fragile across deploys; it only messages
// open clients, which run the actual replay with drainQueue().
self.addEventListener("sync", (event) => {
  if (event.tag !== SYNC_TAG) return;
  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientsList) client.postMessage({ type: "showradar:replay-queue" });
    })(),
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "ShowRadar", body: event.data.text() };
  }

  const title = payload.title || "ShowRadar";
  const options = {
    body: payload.body || "",
    icon: "/icons/icon-192.png",
    data: { url: payload.url || "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = clientsList.find((client) => client.url.includes(targetUrl));
      if (existing) {
        await existing.focus();
        return;
      }
      const anyClient = clientsList[0];
      if (anyClient) {
        await anyClient.navigate(targetUrl);
        await anyClient.focus();
        return;
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});
