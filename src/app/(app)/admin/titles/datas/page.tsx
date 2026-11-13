import { AdminSeriesSubTabs } from "@/components/admin/admin-sub-tabs";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { AjustesDataLancamento } from "@/components/admin/ajustes-data-lancamento";
import { listarAjustesDataLancamento } from "@/lib/ajustes-data-lancamento";
import { formatDateTime } from "@/lib/format-date";

export default async function AdminDatasLancamentoPage() {
  const ajustes = await listarAjustesDataLancamento();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-muted-foreground">Visão geral e gerenciamento do ShowRadar.</p>
      </div>

      <AdminTabs active="/admin/titles" />
      <AdminSeriesSubTabs active="/admin/titles/datas" />

      <AjustesDataLancamento
        ajustes={ajustes.map((a) => ({ ...a, atualizadoEm: formatDateTime(a.atualizadoEm) }))}
      />
    </div>
  );
}
