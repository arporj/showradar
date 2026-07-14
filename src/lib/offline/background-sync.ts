"use client";

// Mirrored in public/sw.js's `sync` event listener — keep the two in sync.
export const SYNC_TAG = "showradar-mutation-queue";

// Best-effort only — Safari/iOS has no SyncManager at all (this app
// explicitly supports iOS via ios-install-prompt.tsx), so this must never
// throw there. The 'online' listener in offline-sync-manager.tsx is the
// mechanism this app actually relies on; this just wakes the queue up
// sooner on browsers that support it.
export async function requestBackgroundSync() {
  if (!("serviceWorker" in navigator) || !("SyncManager" in window)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register(SYNC_TAG);
  } catch {
    // Registration can also fail for reasons unrelated to browser support
    // (permissions policy, etc.) — never let this block queuing a mutation.
  }
}
