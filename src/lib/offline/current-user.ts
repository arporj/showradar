// No client-side session context exists in this app (every page reads
// auth() server-side and threads the user down as props), and the session
// cookie is httpOnly — so the offline queue needs the user id injected
// explicitly by OfflineSyncManager rather than reading it itself. A module
// singleton (not React context) matches the "no unnecessary abstraction"
// grain of this codebase for a value that's read from plain async functions
// outside the component tree (queue.ts, run-or-queue.ts).
let currentUserId: string | null = null;

export function setOfflineUserId(userId: string) {
  currentUserId = userId;
}

export function getOfflineUserId(): string | null {
  return currentUserId;
}
