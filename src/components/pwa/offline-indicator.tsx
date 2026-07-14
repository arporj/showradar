"use client";

import { WifiOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useOnlineStatus } from "@/lib/offline/network-status";

export function OfflineIndicator() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <Badge variant="destructive" role="status" aria-live="polite">
      <WifiOff /> Offline
    </Badge>
  );
}
