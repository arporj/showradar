import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import Link from "next/link";

import { AdminTabs } from "@/components/admin/admin-tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  type AdminUserSort,
  getAdminUserMetrics,
  parseAdminUserSort,
  searchAdminUsers,
  type SortDirection,
} from "@/lib/admin";
import { formatDate, formatRelativeTime } from "@/lib/format-date";

const PLAN_FILTERS: { value: "free" | "premium" | undefined; label: string }[] = [
  { value: undefined, label: "Todos" },
  { value: "free", label: "Free" },
  { value: "premium", label: "Premium" },
];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; plan?: string; page?: string; sort?: string; dir?: string }>;
}) {
  const { q, plan: planParam, page: pageParam, sort: sortParam, dir: dirParam } = await searchParams;
  const plan = planParam === "free" || planParam === "premium" ? planParam : undefined;
  const page = Math.max(1, Number(pageParam) || 1);
  const { sort, dir } = parseAdminUserSort(sortParam, dirParam);
  const isDefaultSort = sort === "cadastro" && dir === "desc";

  const [{ totalUsers, activeUsers30d, newSignups30d }, { users, hasMore }] = await Promise.all([
    getAdminUserMetrics(),
    searchAdminUsers({ query: q, plan, page, sort, dir }),
  ]);

  const buildHref = (overrides: {
    q?: string;
    plan?: string;
    page?: number;
    sort?: AdminUserSort;
    dir?: SortDirection;
  }) => {
    const params = new URLSearchParams();
    const nextQ = overrides.q ?? q;
    const nextPlan = overrides.plan ?? plan;
    const nextSort = overrides.sort ?? sort;
    const nextDir = overrides.dir ?? dir;
    if (nextQ) params.set("q", nextQ);
    if (nextPlan) params.set("plan", nextPlan);
    if (nextSort !== "cadastro" || nextDir !== "desc") {
      params.set("sort", nextSort);
      params.set("dir", nextDir);
    }
    if (overrides.page && overrides.page > 1) params.set("page", String(overrides.page));
    const qs = params.toString();
    return qs ? `/admin?${qs}` : "/admin";
  };

  // Clicar na coluna já ordenada inverte a direção; clicar em outra começa
  // pelo mais recente. Toda troca de ordem volta para a página 1.
  const sortableHeader = (column: AdminUserSort, label: string) => {
    const isActive = sort === column;
    const nextDir: SortDirection = isActive && dir === "desc" ? "asc" : "desc";
    const Icon = !isActive ? ArrowUpDown : dir === "desc" ? ArrowDown : ArrowUp;
    const stateLabel = !isActive ? "" : dir === "desc" ? " (mais recente primeiro)" : " (mais antigo primeiro)";
    return (
      <th
        className="px-4 py-2 font-medium"
        aria-sort={!isActive ? "none" : dir === "desc" ? "descending" : "ascending"}
      >
        <Link
          href={buildHref({ sort: column, dir: nextDir, page: 1 })}
          className={`inline-flex items-center gap-1 hover:text-foreground ${isActive ? "text-foreground" : ""}`}
          aria-label={`Ordenar por ${label.toLowerCase()}${stateLabel}`}
        >
          {label}
          <Icon className="size-3.5" aria-hidden="true" />
        </Link>
      </th>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-muted-foreground">Visão geral e gerenciamento do ShowRadar.</p>
      </div>

      <AdminTabs active="/admin" />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Total de usuários</p>
          <p className="text-3xl font-semibold">{totalUsers}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Ativos nos últimos 30 dias</p>
          <p className="text-3xl font-semibold">{activeUsers30d}</p>
          <p className="text-xs text-muted-foreground">Pessoas que abriram o app no período</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Cadastros nos últimos 30 dias</p>
          <p className="text-3xl font-semibold">{newSignups30d}</p>
        </div>
      </div>

      <form className="flex gap-2" action="/admin">
        {plan && <input type="hidden" name="plan" value={plan} />}
        {!isDefaultSort && (
          <>
            <input type="hidden" name="sort" value={sort} />
            <input type="hidden" name="dir" value={dir} />
          </>
        )}
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
                {sortableHeader("cadastro", "Cadastro")}
                {sortableHeader("acesso", "Último acesso")}
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
                  <td className="px-4 py-2 text-muted-foreground">
                    {user.lastActiveAt ? formatRelativeTime(user.lastActiveAt) : "—"}
                  </td>
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
