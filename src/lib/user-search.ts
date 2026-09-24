import { and, eq, ilike, isNotNull, ne, or } from "drizzle-orm";

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
// An empty query lists everyone (aba "Pessoas" do /social). Suspended
// accounts and ones still mid-onboarding (no username yet, so no profile URL
// to link to) never show up.
export function buildUserSearchCondition(viewerId: string, query: string) {
  const listable = and(ne(users.id, viewerId), eq(users.isSuspended, false), isNotNull(users.username));

  if (!query) return listable;

  if (query.includes("@")) {
    return and(listable, eq(users.email, query.trim().toLowerCase()));
  }

  const pattern = `%${escapeLikePattern(query)}%`;
  return and(listable, or(ilike(users.username, pattern), ilike(users.name, pattern)));
}
