import Link from "next/link";

import { FollowButton } from "@/components/social/follow-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { PopularUser } from "@/lib/discovery";

export function PopularUserCard({ user }: { user: PopularUser }) {
  const displayName = user.name ?? user.username ?? "";

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <Link href={`/user/${user.username}`} className="flex flex-1 items-center gap-3 hover:opacity-80">
        <Avatar className="size-14">
          <AvatarImage src={user.avatarUrl ?? undefined} alt={displayName} />
          <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{displayName}</p>
          <p className="text-sm text-muted-foreground">@{user.username}</p>
          <p className="text-xs text-muted-foreground">
            {user.followerCount} {user.followerCount === 1 ? "seguidor" : "seguidores"}
          </p>
        </div>
      </Link>
      <FollowButton targetUserId={user.id} targetUsername={user.username ?? ""} initialStatus={user.followStatus} />
    </div>
  );
}
