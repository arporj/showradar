import Link from "next/link";

import { AdminTabs } from "@/components/admin/admin-tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getAdminUserMetrics, searchAdminUsers } from "@/lib/admin";
import { formatDate } from "@/lib/format-date";

const PLAN_FILTERS: { value: "free" | "premium" | undefined; label: string }[] = [
  { value: undefined, label: "Todos" },
  { value: "free", label: "Free" },
  { value: "premium", label: "Premium" },
];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; plan?: string; page?: string }>;
}) {
  const { q, plan: planParam, page: pageParam } = await searchParams;
  const plan = planParam === "free" || planParam === "premium" ? planParam : undefined;
  const page = Math.max(1, Number(pageParam) || 1);

  const [{ totalUsers, newSignups30d }, { users, hasMore }] = await Promise.all([
    getAdminUserMetrics(),
    searchAdminUsers({ query: q, plan, page }),
  ]);

  const buildHref = (overrides: { q?: string; plan?: string; page?: number }) => {
    const params = new URLSearchParams();
    const nextQ = overrides.q ?? q;
    const nextPlan = overrides.plan ?? plan;
    if (nextQ) params.set("q", nextQ);
    if (nextPlan) params.set("plan", nextPlan);
    if (overrides.page && overrides.page > 1) params.set("page", String(overrides.page));
    const qs = params.toString();
    return qs ? `/admin?${qs}` : "/admin";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-muted-foreground">Visão geral e gerenciamento do ShowRadar.</p>
      </div>

      <AdminTabs active="/admin" />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Total de usuários</p>
          <p className="text-3xl font-semibold">{totalUsers}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Cadastros nos últimos 30 dias</p>
          <p className="text-3xl font-semibold">{newSignups30d}</p>
        </div>
      </div>

      <form className="flex gap-2" action="/admin">
        {plan && <input type="hidden" name="plan" value={plan} />}
        <Input name="q" defaultValue={q ?? ""} placeholder="Nome, username ou e-mail..." />
      </form>

      <div className="flex flex-wrap gap-2">
        {PLAN_FILTERS.map((filter) => {
          const isActive = plan === filter.value;
          return (
            <Link
              key={filter.label}
              href={buildHref({ plan: filter.value ?? "", page: 1 })}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                isActive
                  ? "border-foreground bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">E-mail</th>
                <th className="px-4 py-2 font-medium">Plano</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2">
                    <Link href={`/admin/users/${user.id}`} className="font-medium hover:underline">
                      {user.name ?? user.username ?? "—"}
                    </Link>
                    <p className="text-xs text-muted-foreground">@{user.username ?? "sem username"}</p>
                  </td>
                  <td className="px-4 py-2">{user.email}</td>
                  <td className="px-4 py-2">
                    <Badge variant={user.plan === "premium" ? "default" : "secondary"}>{user.plan}</Badge>
                  </td>
                  <td className="px-4 py-2">
                    {user.isSuspended ? <Badge variant="destructive">Suspenso</Badge> : <Badge variant="secondary">Ativo</Badge>}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{formatDate(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-between text-sm">
        {page > 1 ? (
          <Link href={buildHref({ page: page - 1 })} className="underline">
            ← Anterior
          </Link>
        ) : (
          <span />
        )}
        {hasMore && (
          <Link href={buildHref({ page: page + 1 })} className="underline">
            Próxima →
          </Link>
        )}
      </div>
    </div>
  );
}
