"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { sendFollowRequest, unfollow } from "@/lib/actions/follow";
import type { FollowStatus } from "@/lib/user-search";

const LABEL: Record<FollowStatus, string> = {
  none: "Seguir",
  pending: "Solicitado",
  accepted: "Seguindo",
};

export function FollowButton({
  targetUserId,
  targetUsername,
  initialStatus,
}: {
  targetUserId: string;
  targetUsername: string;
  initialStatus: FollowStatus;
}) {
  const [status, setStatus] = useState<FollowStatus>(initialStatus);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      if (status === "none") {
        await sendFollowRequest(targetUserId, targetUsername);
        setStatus("pending");
      } else {
        await unfollow(targetUserId, targetUsername);
        setStatus("none");
      }
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={status === "none" ? "default" : "outline"}
      disabled={isPending}
      onClick={handleClick}
    >
      {isPending ? "..." : LABEL[status]}
    </Button>
  );
}
