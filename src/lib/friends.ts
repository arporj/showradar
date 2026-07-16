import { and, eq } from "drizzle-orm";

import { follows, users } from "@/db/schema";
import { db } from "@/lib/db";

export interface Friend {
  id: string;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
}

// Mutual follows only (same relation /friends renders) — used to scope the
// "@" mention autocomplete in episode comments to people the user actually
// knows, not the whole app.
export async function getFriends(userId: string): Promise<Friend[]> {
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      avatarUrl: users.avatarUrl,
      image: users.image,
    })
    .from(follows)
    .innerJoin(users, eq(follows.followingId, users.id))
    .where(and(eq(follows.followerId, userId), eq(follows.status, "accepted")));

  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    name: row.name,
    avatarUrl: row.avatarUrl ?? row.image,
  }));
}
