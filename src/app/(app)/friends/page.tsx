import Link from "next/link";

import { and, eq, sql } from "drizzle-orm";

import { UserResultCard } from "@/components/search/user-result-card";
import { follows, userLibrary, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function FriendsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const titlesInCommon = sql<number>`(
    select count(*)::int
    from ${userLibrary} as my_library
    inner join ${userLibrary} as their_library on their_library.title_id = my_library.title_id
    where my_library.user_id = ${session.user.id} and their_library.user_id = ${users.id}
  )`;

  const friends = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      avatarUrl: users.avatarUrl,
      image: users.image,
      titlesInCommon: titlesInCommon.as("titles_in_common"),
    })
    .from(follows)
    .innerJoin(users, eq(follows.followingId, users.id))
    .where(and(eq(follows.followerId, session.user.id), eq(follows.status, "accepted")));

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Amigos</h1>
        <p className="text-muted-foreground">Pessoas que seguem você e que você segue de volta.</p>
      </div>

      {friends.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Você ainda não tem amigos. <Link href="/search" className="underline">Buscar pessoas</Link>.
        </p>
      ) : (
        <div className="space-y-3">
          {friends.map((friend) => (
            <UserResultCard
              key={friend.id}
              result={{
                id: friend.id,
                username: friend.username,
                name: friend.name,
                avatarUrl: friend.avatarUrl ?? friend.image,
                titlesInCommon: friend.titlesInCommon,
                followStatus: "accepted",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
