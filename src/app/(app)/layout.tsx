import { redirect } from "next/navigation";

import { AuthedShell } from "@/components/layout/authed-shell";
import { auth } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    // Not a plain redirect("/login") — if the session is invalid (e.g. the
    // user no longer exists), the stale cookie needs to actually be cleared,
    // which a Server Component can't do itself. See /api/auth/invalidate.
    redirect("/api/auth/invalidate");
  }

  return <AuthedShell user={session.user}>{children}</AuthedShell>;
}
