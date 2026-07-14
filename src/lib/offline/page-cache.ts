// Mirror of PAGE_CACHE_NAME in public/sw.js — keep the two in sync.
const PAGE_CACHE_NAME = "showradar-pages-v1";

// The service worker intercepts navigation before any network round-trip,
// so a cached /dashboard or /library response never passes through
// proxy.ts's auth check. On a shared device, signing out must clear it —
// otherwise going offline afterwards would still serve the previous user's
// authenticated snapshot. See sign-out-form.tsx for the call site.
export async function clearOfflinePageCacheOnSignOut() {
  if (typeof window === "undefined" || !("caches" in window)) return;
  try {
    await caches.delete(PAGE_CACHE_NAME);
  } catch {
    // Best-effort — never block sign-out on this.
  }
}
