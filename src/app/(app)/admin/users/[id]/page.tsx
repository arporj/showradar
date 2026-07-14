import { notFound } from "next/navigation";

import { PlanControl } from "@/components/admin/plan-control";
import { SuspendToggle } from "@/components/admin/suspend-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/ui/back-button";
import { getAdminUserDetail } from "@/lib/admin";
import { formatDate } from "@/lib/format-date";

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getAdminUserDetail(id);
  if (!detail) notFound();

  const { user, libraryCount } = detail;
  const displayName = user.name ?? user.username ?? "";

  return (
    <div className="max-w-lg space-y-6">
      <BackButton />

      <div className="flex items-center gap-4">
        <Avatar className="size-16">
          <AvatarImage src={user.avatarUrl ?? user.image ?? undefined} alt={displayName} />
          <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{displayName}</h1>
          <p className="text-muted-foreground">
            @{user.username ?? "sem username"} · {user.email}
          </p>
          {user.role === "admin" && <Badge className="mt-1">Admin</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="rounded-lg border p-3">
          <p className="text-muted-foreground">Membro desde</p>
          <p className="font-medium">{formatDate(user.createdAt)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-muted-foreground">Itens na grade</p>
          <p className="font-medium">{libraryCount}</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Plano</p>
        <PlanControl userId={user.id} initialPlan={user.plan} />
      </div>

      <SuspendToggle userId={user.id} initialSuspended={user.isSuspended} />
    </div>
  );
}
