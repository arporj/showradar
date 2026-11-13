"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AJUSTE_DIAS_MAXIMO,
  AJUSTE_DIAS_MINIMO,
  ajusteDataLancamentoSchema,
  descreverAjuste,
} from "@/dominio/ajuste-data-lancamento";
import { removerAjusteDataLancamento, salvarAjusteDataLancamento } from "@/lib/actions/admin";

export interface AjusteNaTela {
  titleId: string;
  tmdbId: number;
  nome: string;
  dias: number;
  motivo: string;
  atualizadoEm: string;
  atualizadoPor: string | null;
}

const OPCOES_DIAS = Array.from(
  { length: AJUSTE_DIAS_MAXIMO - AJUSTE_DIAS_MINIMO + 1 },
  (_, i) => AJUSTE_DIAS_MINIMO + i,
).filter((d) => d !== 0);

type Campo = "tmdbId" | "dias" | "motivo";

function errosDoFormulario(valores: Record<Campo, string>): Partial<Record<Campo, string>> {
  const resultado = ajusteDataLancamentoSchema.safeParse(valores);
  if (resultado.success) return {};
  const erros: Partial<Record<Campo, string>> = {};
  for (const issue of resultado.error.issues) {
    const campo = issue.path[0] as Campo;
    erros[campo] ??= issue.message;
  }
  return erros;
}

export function AjustesDataLancamento({ ajustes }: { ajustes: AjusteNaTela[] }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-medium">Ajuste de data de lançamento</h2>
        <p className="text-sm text-muted-foreground">
          Para séries que saem no Brasil em outro dia da data do TMDb. Ex.: o TMDb marca domingo, mas o streaming
          lança na sexta: ajuste de 2 dias antes. Vale para as datas do site, os avisos e os posts da semana.
        </p>
      </div>

      <FormularioAjuste />

      {ajustes.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Nenhuma série com ajuste. Todas usam a data do TMDb (com +1 dia automático para a Apple TV+).
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Série</th>
                <th className="px-4 py-2 font-medium">Ajuste</th>
                <th className="px-4 py-2 font-medium">Motivo</th>
                <th className="px-4 py-2 font-medium">Alterado</th>
                <th className="px-4 py-2" aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {ajustes.map((a) => (
                <tr key={a.titleId} className="border-b last:border-0">
                  <td className="px-4 py-2">
                    {a.nome}
                    <span className="block text-xs text-muted-foreground">TMDb {a.tmdbId}</span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">{descreverAjuste(a.dias)}</td>
                  <td className="px-4 py-2">{a.motivo}</td>
                  <td className="px-4 py-2 text-xs whitespace-nowrap text-muted-foreground">
                    {a.atualizadoEm}
                    {a.atualizadoPor && <span className="block">por {a.atualizadoPor}</span>}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <BotaoRemover ajuste={a} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FormularioAjuste() {
  const router = useRouter();
  const [valores, setValores] = useState<Record<Campo, string>>({ tmdbId: "", dias: "-2", motivo: "" });
  const [tocados, setTocados] = useState<Partial<Record<Campo, boolean>>>({});
  const [isPending, startTransition] = useTransition();
  const erros = errosDoFormulario(valores);
  const valido = Object.keys(erros).length === 0;

  function alterar(campo: Campo, valor: string) {
    setValores((v) => ({ ...v, [campo]: valor }));
    setTocados((t) => ({ ...t, [campo]: true }));
  }

  function erroVisivel(campo: Campo) {
    return tocados[campo] ? erros[campo] : undefined;
  }

  function enviar(event: React.FormEvent) {
    event.preventDefault();
    setTocados({ tmdbId: true, dias: true, motivo: true });
    if (!valido) return;
    startTransition(async () => {
      const resultado = await salvarAjusteDataLancamento(valores);
      if (!resultado.ok) {
        toast.error(resultado.erro);
        return;
      }
      toast.success("Ajuste salvo. As datas da série já foram atualizadas.");
      setValores({ tmdbId: "", dias: "-2", motivo: "" });
      setTocados({});
      router.refresh();
    });
  }

  return (
    <form onSubmit={enviar} noValidate className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[10rem_12rem_1fr_auto] sm:items-start">
      <div className="space-y-1.5">
        <Label htmlFor="ajuste-tmdb">Número no TMDb</Label>
        <Input
          id="ajuste-tmdb"
          inputMode="numeric"
          placeholder="Ex.: 259909"
          value={valores.tmdbId}
          onChange={(e) => alterar("tmdbId", e.target.value.replace(/\D/g, ""))}
          aria-invalid={!!erroVisivel("tmdbId")}
          aria-describedby="ajuste-tmdb-ajuda"
          disabled={isPending}
        />
        <p id="ajuste-tmdb-ajuda" className={`text-xs ${erroVisivel("tmdbId") ? "text-destructive" : "text-muted-foreground"}`}>
          {erroVisivel("tmdbId") ?? "Está no endereço da série: /title/tv/259909"}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ajuste-dias">Lança no Brasil</Label>
        <select
          id="ajuste-dias"
          value={valores.dias}
          onChange={(e) => alterar("dias", e.target.value)}
          disabled={isPending}
          className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          {OPCOES_DIAS.map((d) => (
            <option key={d} value={d}>
              {descreverAjuste(d)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ajuste-motivo">Motivo</Label>
        <Input
          id="ajuste-motivo"
          placeholder="Ex.: Paramount+ lança na sexta; TMDb usa o domingo do Showtime"
          maxLength={200}
          value={valores.motivo}
          onChange={(e) => alterar("motivo", e.target.value)}
          aria-invalid={!!erroVisivel("motivo")}
          aria-describedby={erroVisivel("motivo") ? "ajuste-motivo-erro" : undefined}
          disabled={isPending}
        />
        {erroVisivel("motivo") && (
          <p id="ajuste-motivo-erro" className="text-xs text-destructive">
            {erroVisivel("motivo")}
          </p>
        )}
      </div>

      <Button type="submit" disabled={isPending} className="sm:mt-6">
        {isPending ? "Salvando..." : "Salvar ajuste"}
      </Button>
    </form>
  );
}

function BotaoRemover({ ajuste }: { ajuste: AjusteNaTela }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function remover() {
    startTransition(async () => {
      const resultado = await removerAjusteDataLancamento(ajuste.titleId);
      if (!resultado.ok) {
        toast.error(resultado.erro);
        return;
      }
      toast.success(`${ajuste.nome} voltou a usar a data do TMDb.`);
      router.refresh();
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button type="button" variant="ghost" size="sm" disabled={isPending} aria-label={`Remover ajuste de ${ajuste.nome}`}>
            <Trash2 /> {isPending ? "Removendo..." : "Remover"}
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover o ajuste de &ldquo;{ajuste.nome}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            A série volta a usar a data do TMDb no site, nos avisos e nos posts da semana.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={remover} disabled={isPending}>
            Remover
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
