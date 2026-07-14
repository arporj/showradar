"use client";

import { useEffect, useState } from "react";

export function isOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

// Mirrors the SSR guard pattern already used by theme-toggle.tsx: the server
// has no `navigator`, so this starts "online" (indicator hidden) and only
// flips after mount.
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount flip, not a cascading update
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}
