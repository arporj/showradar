"use client";

import { useState, useTransition } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { acceptFollowRequest, declineFollowRequest } from "@/lib/actions/follow";

export function FollowRequestCard({
  followId,
  username,
  name,
  avatarUrl,
}: {
  followId: string;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
}) {
  const [resolved, setResolved] = useState<"accepted" | "declined" | null>(null);
  const [isPending, startTransition] = useTransition();
  const displayName = name ?? username ?? "";

  if (resolved) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
        <p className="text-sm text-muted-foreground">
          {resolved === "accepted" ? `Você aceitou @${username}.` : `Pedido de @${username} recusado.`}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <Avatar className="size-12">
        <AvatarImage src={avatarUrl ?? undefined} alt={displayName} />
        <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <p className="font-medium">{displayName}</p>
        <p className="text-sm text-muted-foreground">@{username}</p>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={isPending}
          onClick={() => startTransition(async () => {
            await acceptFollowRequest(followId);
            setResolved("accepted");
          })}
        >
          Aceitar
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => startTransition(async () => {
            await declineFollowRequest(followId);
            setResolved("declined");
          })}
        >
          Recusar
        </Button>
      </div>
    </div>
  );
}
