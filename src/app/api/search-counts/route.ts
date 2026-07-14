import { count } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { searchMovieFuzzy, searchPersonFuzzy, searchTvFuzzy, type TmdbSearchResponse } from "@/lib/tmdb";
import { buildUserSearchCondition } from "@/lib/user-search";

// The fuzzy fallback can merge in spelling variants, growing the results
// array past TMDb's own total_results for the primary query alone.
async function resultCount(promise: Promise<TmdbSearchResponse>) {
  try {
    const data = await promise;
    return Math.max(data.total_results, data.results.length);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const query = req.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length < 2) {
    return NextResponse.json({ movie: null, tv: null, person: null, user: null });
  }

  const [movie, tv, person, userCount] = await Promise.all([
    resultCount(searchMovieFuzzy(query)),
    resultCount(searchTvFuzzy(query)),
    resultCount(searchPersonFuzzy(query)),
    db
      .select({ value: count() })
      .from(users)
      .where(buildUserSearchCondition(session.user.id, query))
      .then((rows) => rows[0]?.value ?? null)
      .catch(() => null),
  ]);

  return NextResponse.json({ movie, tv, person, user: userCount });
}
