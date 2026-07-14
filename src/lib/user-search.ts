import { and, eq, ilike, ne, or } from "drizzle-orm";

import { users } from "@/db/schema";

export type FollowStatus = "none" | "pending" | "accepted";

export interface UserSearchResult {
  id: string;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
  titlesInCommon: number;
  followStatus: FollowStatus;
}

export function escapeLikePattern(value: string) {
  return value.replace(/[%_\\]/g, (char) => `\\${char}`);
}

// Email matches are exact-only, never `ilike` — a partial match would turn
// this into a tool for enumerating other people's email addresses. Username
// and display name matches stay partial, since those are meant for discovery.
export function buildUserSearchCondition(viewerId: string, query: string) {
  const notSelf = ne(users.id, viewerId);

  if (query.includes("@")) {
    return and(notSelf, eq(users.email, query.trim().toLowerCase()));
  }

  const pattern = `%${escapeLikePattern(query)}%`;
  return and(notSelf, or(ilike(users.username, pattern), ilike(users.name, pattern)));
}
