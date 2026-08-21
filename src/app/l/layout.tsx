import { PublicShell } from "@/components/layout/public-shell";
import { auth } from "@/lib/auth";

export default async function PublicListLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return <PublicShell authed={!!session?.user}>{children}</PublicShell>;
}
