import { and, eq } from "drizzle-orm";

import { FollowRequestCard } from "@/components/social/follow-request-card";
import { follows, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function FollowRequestsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const pending = await db
    .select({
      followId: follows.id,
      username: users.username,
      name: users.name,
      avatarUrl: users.avatarUrl,
      image: users.image,
    })
    .from(follows)
    .innerJoin(users, eq(follows.followerId, users.id))
    .where(and(eq(follows.followingId, session.user.id), eq(follows.status, "pending")));

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Solicitações de seguir</h1>
        <p className="text-muted-foreground">Pedidos de outras pessoas para ver a sua grade.</p>
      </div>

      {pending.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma solicitação pendente.</p>
      ) : (
        <div className="space-y-3">
          {pending.map((row) => (
            <FollowRequestCard
              key={row.followId}
              followId={row.followId}
              username={row.username}
              name={row.name}
              avatarUrl={row.avatarUrl ?? row.image}
            />
          ))}
        </div>
      )}
    </div>
  );
}
