import Link from "next/link";

import { FollowButton } from "@/components/social/follow-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { UserSearchResult } from "@/lib/user-search";

export function UserResultCard({ result }: { result: UserSearchResult }) {
  const displayName = result.name ?? result.username ?? "";

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <Link href={`/user/${result.username}`} className="flex flex-1 items-center gap-3 hover:opacity-80">
        <Avatar className="size-14">
          <AvatarImage src={result.avatarUrl ?? undefined} alt={displayName} />
          <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{displayName}</p>
          <p className="text-sm text-muted-foreground">@{result.username}</p>
          <p className="text-xs text-muted-foreground">
            {result.titlesInCommon} {result.titlesInCommon === 1 ? "título em comum" : "títulos em comum"}
          </p>
        </div>
      </Link>
      <FollowButton
        targetUserId={result.id}
        targetUsername={result.username ?? ""}
        initialStatus={result.followStatus}
      />
    </div>
  );
}
