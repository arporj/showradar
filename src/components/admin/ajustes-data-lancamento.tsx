"use client";

import { Search, Trash2, Tv } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  AJUSTE_DIAS_MAXIMO,
  AJUSTE_DIAS_MINIMO,
  ajusteDataLancamentoSchema,
  descreverAjuste,
} from "@/dominio/ajuste-data-lancamento";
import { removerAjusteDataLancamento, salvarAjusteDataLancamento } from "@/lib/actions/admin";
import { tmdbImageUrl, type TmdbSearchResult } from "@/lib/tmdb";
import { tmdbImageLoader } from "@/lib/tmdb-image-loader";

export interface AjusteNaTela {
  titleId: string;
  tmdbId: number;
  nome: string;
  dias: number;
  motivo: string;
  atualizadoEm: string;
  atualizadoPor: string | null;
}

interface SerieEscolhida {
  tmdbId: number;
  nome: string;
  ano: string | null;
  posterPath: string | null;
}

const OPCOES_DIAS = Array.from(
  { length: AJUSTE_DIAS_MAXIMO - AJUSTE_DIAS_MINIMO + 1 },
  (_, i) => AJUSTE_DIAS_MINIMO + i,
).filter((d) => d !== 0);

const DIAS_PADRAO = "-2";
const CLASSE_SELECT =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

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
                    <Link href={`/title/tv/${a.tmdbId}`} className="font-medium underline-offset-4 hover:underline">
                      {a.nome}
                    </Link>
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
  const [serie, setSerie] = useState<SerieEscolhida | null>(null);
  const [dias, setDias] = useState(DIAS_PADRAO);
  const [motivo, setMotivo] = useState("");
  const [tocados, setTocados] = useState<Partial<Record<Campo, boolean>>>({});
  const [isPending, startTransition] = useTransition();
  const valores = { tmdbId: serie ? String(serie.tmdbId) : "", dias, motivo };
  const erros = errosDoFormulario(valores);
  const valido = Object.keys(erros).length === 0;

  function erroVisivel(campo: Campo) {
    return tocados[campo] ? erros[campo] : undefined;
  }

  function enviar(event: React.FormEvent) {
    event.preventDefault();
    setTocados({ tmdbId: true, dias: true, motivo: true });
    if (!valido || !serie) return;
    startTransition(async () => {
      const resultado = await salvarAjusteDataLancamento(valores);
      if (!resultado.ok) {
        toast.error(resultado.erro);
        return;
      }
      toast.success(`Ajuste de ${serie.nome} salvo. As datas da série já foram atualizadas.`);
      setSerie(null);
      setDias(DIAS_PADRAO);
      setMotivo("");
      setTocados({});
      router.refresh();
    });
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-4 rounded-lg border p-4">
      <SeletorDeSerie
        serie={serie}
        onEscolher={(s) => {
          setSerie(s);
          setTocados((t) => ({ ...t, tmdbId: true }));
        }}
        erro={erroVisivel("tmdbId")}
        disabled={isPending}
      />

      <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor="ajuste-dias">Lança no Brasil</Label>
          <select
            id="ajuste-dias"
            value={dias}
            onChange={(e) => setDias(e.target.value)}
            disabled={isPending}
            className={CLASSE_SELECT}
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
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              setTocados((t) => ({ ...t, motivo: true }));
            }}
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
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar ajuste"}
      </Button>
    </form>
  );
}

type EstadoBusca =
  | { tipo: "parado" }
  | { tipo: "buscando" }
  | { tipo: "erro" }
  | { tipo: "pronto"; resultados: SerieEscolhida[] };

const MINIMO_LETRAS = 2;

function paraSerie(r: TmdbSearchResult): SerieEscolhida {
  return {
    tmdbId: r.id,
    nome: r.name ?? r.title ?? "Sem nome",
    ano: r.first_air_date ? r.first_air_date.slice(0, 4) : null,
    posterPath: r.poster_path ?? null,
  };
}

function SeletorDeSerie({
  serie,
  onEscolher,
  erro,
  disabled,
}: {
  serie: SerieEscolhida | null;
  onEscolher: (serie: SerieEscolhida | null) => void;
  erro?: string;
  disabled: boolean;
}) {
  const [texto, setTexto] = useState("");
  const [termo, setTermo] = useState("");
  const [tentativa, setTentativa] = useState(0);
  // Resposta da última busca concluída, com a chave (termo + tentativa) que a
  // gerou: enquanto a chave atual não tem resposta, a busca está em andamento.
  const [resposta, setResposta] = useState<{ chave: string; estado: EstadoBusca } | null>(null);
  const chave = `${tentativa}:${termo}`;
  const busca: EstadoBusca = !termo
    ? { tipo: "parado" }
    : resposta?.chave === chave
      ? resposta.estado
      : { tipo: "buscando" };

  useEffect(() => {
    const limpo = texto.trim();
    const timeout = setTimeout(() => setTermo(limpo.length >= MINIMO_LETRAS ? limpo : ""), 300);
    return () => clearTimeout(timeout);
  }, [texto]);

  useEffect(() => {
    if (!termo) return;
    const controle = new AbortController();
    const chaveDaBusca = `${tentativa}:${termo}`;
    fetch(`/api/tmdb/search?type=tv&q=${encodeURIComponent(termo)}`, { signal: controle.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`busca de séries respondeu ${r.status}`);
        const dados = (await r.json()) as { results: TmdbSearchResult[] };
        const resultados = dados.results.filter((s) => s.media_type === "tv").map(paraSerie);
        setResposta({ chave: chaveDaBusca, estado: { tipo: "pronto", resultados } });
      })
      .catch((falha: unknown) => {
        if (controle.signal.aborted) return;
        console.error("[admin] falha na busca de séries para ajuste de data", falha);
        setResposta({ chave: chaveDaBusca, estado: { tipo: "erro" } });
      });
    return () => controle.abort();
  }, [termo, tentativa]);

  if (serie) {
    return (
      <div className="space-y-1.5">
        <p className="text-sm font-medium">Série</p>
        <div className="flex items-center gap-3 rounded-lg border p-2">
          <Poster serie={serie} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{serie.nome}</p>
            {serie.ano && <p className="text-xs text-muted-foreground">Estreia em {serie.ano}</p>}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => onEscolher(null)} disabled={disabled}>
            Trocar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor="ajuste-serie">Série</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="ajuste-serie"
          type="search"
          autoComplete="off"
          placeholder="Digite o nome da série"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          aria-invalid={!!erro}
          aria-describedby="ajuste-serie-ajuda"
          disabled={disabled}
          className="pl-8"
        />
      </div>
      <p id="ajuste-serie-ajuda" className={`text-xs ${erro ? "text-destructive" : "text-muted-foreground"}`}>
        {erro ?? "Busque pelo nome em português ou no original."}
      </p>

      <ResultadosDaBusca busca={busca} onEscolher={onEscolher} onTentarDeNovo={() => setTentativa((n) => n + 1)} />
    </div>
  );
}

function ResultadosDaBusca({
  busca,
  onEscolher,
  onTentarDeNovo,
}: {
  busca: EstadoBusca;
  onEscolher: (serie: SerieEscolhida) => void;
  onTentarDeNovo: () => void;
}) {
  if (busca.tipo === "parado") return null;

  if (busca.tipo === "buscando") {
    return (
      <div className="space-y-2 rounded-lg border p-2" aria-busy="true" aria-label="Buscando séries">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-12 w-8 shrink-0 rounded" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (busca.tipo === "erro") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 p-3 text-sm">
        <p>A busca não respondeu. Confira a internet e tente de novo.</p>
        <Button type="button" variant="outline" size="sm" onClick={onTentarDeNovo}>
          Tentar de novo
        </Button>
      </div>
    );
  }

  if (busca.resultados.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
        Nenhuma série com esse nome. Tente o nome original ou só uma parte dele.
      </p>
    );
  }

  return (
    <ul className="max-h-80 divide-y overflow-y-auto rounded-lg border" aria-label="Séries encontradas">
      {busca.resultados.map((s) => (
        <li key={s.tmdbId}>
          <button
            type="button"
            onClick={() => onEscolher(s)}
            className="flex min-h-11 w-full items-center gap-3 p-2 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
          >
            <Poster serie={s} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{s.nome}</span>
              <span className="block text-xs text-muted-foreground">{s.ano ? `Estreia em ${s.ano}` : "Sem data de estreia"}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Poster({ serie }: { serie: SerieEscolhida }) {
  const imagem = tmdbImageUrl(serie.posterPath, "w92");
  return (
    <span className="relative flex h-12 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
      {imagem ? (
        <Image loader={tmdbImageLoader} src={imagem} alt="" fill sizes="32px" className="object-cover" />
      ) : (
        <Tv className="size-4 text-muted-foreground" aria-hidden />
      )}
    </span>
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
