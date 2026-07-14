import { createStore, del, entries, get, set } from "idb-keyval";

// One flat store, not one store per user — IndexedDB is per-origin, not
// per-account (this is a shared-device-safe app, see the "sign out of all
// devices" feature), so each queued entry carries its own userId instead.
// The queue is expected to stay tiny (a handful of pending mutations, not
// thousands), so filtering in memory in queue.ts is cheap enough.
export const mutationStore = createStore("showradar-offline", "mutation-queue");

export { del, entries, get, set };
