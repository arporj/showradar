import { AdminTabs } from "@/components/admin/admin-tabs";
import { getAdminTopTitles } from "@/lib/admin";

export default async function AdminTitlesPage() {
  const topTitles = await getAdminTopTitles();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-muted-foreground">Visão geral e gerenciamento do ShowRadar.</p>
      </div>

      <AdminTabs active="/admin/titles" />

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
    </div>
  );
}
