import Link from "next/link";

import { getAdminMetrics } from "@/lib/admin";

export default async function AdminDashboardPage() {
  const { totalUsers, newSignups30d, topTitles } = await getAdminMetrics();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-muted-foreground">Visão geral do ShowRadar.</p>
      </div>

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

      <div>
        <h2 className="mb-3 text-lg font-medium">Títulos mais adicionados</h2>
        {topTitles.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum título na grade de ninguém ainda.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Título</th>
                  <th className="px-4 py-2 font-medium">Tipo</th>
                  <th className="px-4 py-2 font-medium text-right">Na grade de</th>
                </tr>
              </thead>
              <tbody>
                {topTitles.map((title) => (
                  <tr key={title.titleId} className="border-b last:border-0">
                    <td className="px-4 py-2">{title.name}</td>
                    <td className="px-4 py-2">{title.mediaType === "movie" ? "Filme" : "Série"}</td>
                    <td className="px-4 py-2 text-right">{title.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Link href="/admin/users" className="text-sm underline">
        Ver todos os usuários →
      </Link>
    </div>
  );
}
