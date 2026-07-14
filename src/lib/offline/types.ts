import type { LibraryStatus } from "@/lib/library-status";

export type QueuedMutation =
  | {
      id: string;
      userId: string;
      createdAt: number;
      type: "episode-toggle";
      payload: { episodeId: string; watched: boolean; titleId: string; tmdbTvId: number };
    }
  | {
      id: string;
      userId: string;
      createdAt: number;
      type: "season-toggle";
      payload: { seasonId: string; titleId: string; tmdbTvId: number; seasonNumber: number; watched: boolean };
    }
  | {
      id: string;
      userId: string;
      createdAt: number;
      type: "library-status";
      payload: { titleId: string; status: LibraryStatus };
    };

// A plain `Omit<QueuedMutation, ...>` does not distribute over a
// discriminated union — it collapses `payload` into a union of all three
// shapes and loses the `type`↔`payload` correlation. Distributing manually
// keeps call sites type-checked against the right payload for their type.
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

export type NewMutation = DistributiveOmit<QueuedMutation, "id" | "createdAt" | "userId">;
