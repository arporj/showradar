"use client";

import { unstable_rethrow } from "next/navigation";

import { enqueueMutation } from "./queue";
import type { NewMutation } from "./types";

// Wraps a real Server Action call for the online path with a same-shaped
// fallback that writes to the local queue instead. Returns the action's
// result when it actually ran, or `undefined` when queued — callers that use
// the return value (season aired-count, "seriesCompleted" for the
// celebration overlay) must treat `undefined` as "unknown, will resolve once
// synced" rather than assume it ran.
export async function runOrQueue<T>(run: () => Promise<T>, mutation: NewMutation): Promise<T | undefined> {
  if (typeof navigator !== "undefined" && navigator.onLine) {
    try {
      return await run();
    } catch (err) {
      // redirect()/notFound() signal a real navigation, not a network
      // failure — must propagate untouched, or an expired-session
      // redirect("/login") inside these actions would silently be treated
      // as "offline" instead of actually navigating.
      unstable_rethrow(err);
      // Anything else here is treated as "couldn't reach the server" — none
      // of the three queueable actions throw an app-level error today
      // (every early return is a redirect()), so this also covers a genuine
      // mid-request server failure while actually online by queuing and
      // retrying rather than surfacing an error — an accepted simplification
      // for this reduced-scope phase (no real conflict resolution either).
    }
  }
  await enqueueMutation(mutation);
  return undefined;
}
