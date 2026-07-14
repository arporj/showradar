import Link from "next/link";

import { FriendActivityRow } from "@/components/social/friend-activity-row";
import { auth } from "@/lib/auth";
import { getFriendActivity } from "@/lib/feed";

export default async function FeedPage() {
  const session = await auth();
  if (!session?.user) return null;

  const activity = await getFriendActivity(session.user.id);

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Atividade</h1>
        <p className="text-muted-foreground">O que as pessoas que você segue andaram assistindo.</p>
      </div>

      {activity.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ninguém que você segue teve atividade ainda.{" "}
          <Link href="/search" className="underline underline-offset-4">
            Busque pessoas para seguir
          </Link>
          .
        </p>
      ) : (
        <div className="space-y-3">
          {activity.map((item) => (
            <FriendActivityRow key={item.key} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
