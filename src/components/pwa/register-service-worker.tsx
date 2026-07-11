"use client";

import { useEffect } from "react";

// Registers the service worker site-wide (not just on /settings, where
// push-toggle.tsx also registers it for its own purposes — registering the
// same script URL twice is a harmless no-op in the browser). A controlling
// service worker with a fetch handler is part of Chrome/Android's PWA
// installability criteria, so this needs to run on every page, not just the
// one where a user might opt into push notifications.
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installability is a progressive enhancement — a failed registration
      // (unsupported browser, blocked by an extension, etc.) shouldn't be
      // surfaced to the user.
    });
  }, []);

  return null;
}
