import { and, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { follows, userLibrary, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const PAGE_SIZE = 10;

function escapeLikePattern(value: string) {
  return value.replace(/[%_\\]/g, (char) => `\\${char}`);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const query = req.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length < 2) {
    return NextResponse.json({ results: [], hasMore: false });
  }

  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
  const pattern = `%${escapeLikePattern(query)}%`;

  // Count of titles that both the viewer and the candidate have in their
  // library, regardless of status (plan_to_watch/watching/completed/dropped).
  const titlesInCommon = sql<number>`(
    select count(*)::int
    from ${userLibrary} as my_library
    inner join ${userLibrary} as their_library on their_library.title_id = my_library.title_id
    where my_library.user_id = ${session.user.id} and their_library.user_id = ${users.id}
  )`;

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      avatarUrl: users.avatarUrl,
      image: users.image,
      titlesInCommon: titlesInCommon.as("titles_in_common"),
      followStatus: follows.status,
    })
    .from(users)
    .leftJoin(follows, and(eq(follows.followerId, session.user.id), eq(follows.followingId, users.id)))
    .where(and(ne(users.id, session.user.id), or(ilike(users.username, pattern), ilike(users.name, pattern))))
    .orderBy(desc(titlesInCommon))
    // Fetch one extra row as a cheap "is there a next page" peek.
    .limit(PAGE_SIZE + 1)
    .offset((page - 1) * PAGE_SIZE);

  const hasMore = rows.length > PAGE_SIZE;
  const results = rows.slice(0, PAGE_SIZE).map((row) => ({
    id: row.id,
    username: row.username,
    name: row.name,
    avatarUrl: row.avatarUrl ?? row.image,
    titlesInCommon: row.titlesInCommon,
    followStatus: row.followStatus ?? "none",
  }));

  return NextResponse.json({ results, hasMore });
}
