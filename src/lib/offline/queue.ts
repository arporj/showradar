"use client";

import { setSeasonWatched, toggleEpisodeWatched } from "@/lib/actions/episodes";
import { updateLibraryStatus } from "@/lib/actions/library";

import { requestBackgroundSync } from "./background-sync";
import { getOfflineUserId } from "./current-user";
import { del, entries, get, mutationStore, set } from "./db";
import type { NewMutation, QueuedMutation } from "./types";

export async function enqueueMutation(partial: NewMutation) {
  // Defensive fallback only — in the ordinary case OfflineSyncManager has
  // already set this synchronously during the layout's render, before any
  // page below it can hydrate and accept a click. If it's somehow still
  // unknown, namespace under a placeholder instead of silently dropping the
  // user's action — drainQueue() never runs before the real id is known, so
  // this gets reclaimed on the next sync pass.
  const userId = getOfflineUserId() ?? "__unknown__";
  const entry = { ...partial, id: crypto.randomUUID(), createdAt: Date.now(), userId } as QueuedMutation;
  await set(entry.id, entry, mutationStore);
  void requestBackgroundSync();
}

async function sortedQueueForCurrentUser(): Promise<QueuedMutation[]> {
  const userId = getOfflineUserId();
  const all = (await entries(mutationStore)) as [IDBValidKey, QueuedMutation][];
  return all
    .map(([, value]) => value)
    .filter((entry) => entry.userId === userId || entry.userId === "__unknown__")
    .sort((a, b) => a.createdAt - b.createdAt);
}

async function replay(entry: QueuedMutation) {
  switch (entry.type) {
    case "episode-toggle":
      await toggleEpisodeWatched(
        entry.payload.episodeId,
        entry.payload.watched,
        entry.payload.titleId,
        entry.payload.tmdbTvId,
      );
      return;
    case "season-toggle":
      await setSeasonWatched(entry.payload);
      return;
    case "library-status":
      await updateLibraryStatus(entry.payload.titleId, entry.payload.status);
      return;
  }
}

// Same-tab guard: the 'online' event and the service worker's postMessage
// (from a Background Sync 'sync' event) can both fire close together.
let isDraining = false;

// Returns how many entries this call actually replayed, for the sync toast.
export async function drainQueue(): Promise<number> {
  if (isDraining) return 0;
  const userId = getOfflineUserId();
  if (!userId) return 0;

  isDraining = true;
  let synced = 0;
  try {
    for (const entry of await sortedQueueForCurrentUser()) {
      // Re-check right before claiming it — if another tab already
      // deleted+replayed this exact entry, this is a silent no-op, not an
      // error (idb-keyval's get/del on a missing key never throws).
      const stillQueued = await get(entry.id, mutationStore);
      if (!stillQueued) continue;
      await del(entry.id, mutationStore);
      try {
        await replay(entry);
        synced++;
      } catch {
        // Still offline (or a genuine unrelated server error). Put it back
        // so FIFO order and at-least-once delivery are preserved, and stop
        // this pass — further entries would fail the same way right now.
        await set(entry.id, entry, mutationStore);
        break;
      }
    }
  } finally {
    isDraining = false;
  }
  return synced;
}
