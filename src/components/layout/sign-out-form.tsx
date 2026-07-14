"use client";

import { useRef, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { clearOfflinePageCacheOnSignOut } from "@/lib/offline/page-cache";

// Wraps a sign-out Server Action (passed in as a prop from a Server
// Component, same as a plain <form action={...}> would receive) so the
// cached offline snapshot of /dashboard and /library (see public/sw.js) is
// cleared *before* the sign-out actually submits — otherwise, on a shared
// device, the previous user's authenticated HTML would keep serving from
// the Service Worker's cache if the device goes offline after sign-out.
export function SignOutForm({
  action,
  label,
  variant = "ghost",
}: {
  action: () => Promise<void>;
  label: string;
  variant?: "ghost" | "outline";
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    startTransition(async () => {
      await clearOfflinePageCacheOnSignOut();
      formRef.current?.requestSubmit();
    });
  }

  return (
    <form ref={formRef} action={action}>
      <Button type="submit" variant={variant} size="sm" disabled={isPending} onClick={handleClick}>
        {label}
      </Button>
    </form>
  );
}
