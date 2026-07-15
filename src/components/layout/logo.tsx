import { cn } from "@/lib/utils";

// Logotipo oficial do ShowRadar (Vencedor: Opção 3 de design):
// 1. 3 anéis com cores de referência (interno ciano brilhante, médio teal, externo slate/cinza).
// 2. Gaps alinhados a 135° (topo-esquerda / Noroeste) para afastar a abertura da linha de varredura.
// 3. Vetor de varredura (traço radial) posicionado a 225° (embaixo-esquerda / Sudoeste).
// 4. Play sólido centralizado e rotacionado a 315° (Nordeste), com sua base perpendicular a 225°
//    e a ponta direcionada para o sentido oposto.
// 5. Círculo central e vetor de varredura no ciano brilhante.
export function LogoMark({ className }: { className?: string }) {
  // Raios dos anéis com base no viewBox 512x512
  const r1 = 200; // externo
  const r2 = 140; // médio
  const r3 = 80;  // interno

  // Comprimentos das circunferências
  const c1 = 2 * Math.PI * r1;
  const c2 = 2 * Math.PI * r2;
  const c3 = 2 * Math.PI * r3;

  // Tamanho do gap em graus
  const gapFraction = 65 / 360;

  return (
    <svg
      viewBox="0 0 512 512"
      aria-hidden="true"
      className={cn("size-6 select-none", className)}
    >
      {/* 1. Anel Externo - Slate - Gaps a 135° */}
      <circle
        cx="256"
        cy="256"
        r={r1}
        fill="none"
        className="stroke-slate-400/70 dark:stroke-slate-700/60"
        strokeWidth="20"
        strokeLinecap="round"
        strokeDasharray={`${c1 * (1 - gapFraction)} ${c1 * gapFraction}`}
        transform="rotate(168 256 256)"
      />

      {/* 2. Anel Médio - Teal - Gaps a 135° */}
      <circle
        cx="256"
        cy="256"
        r={r2}
        fill="none"
        className="stroke-teal-500/80 dark:stroke-teal-600/75"
        strokeWidth="20"
        strokeLinecap="round"
        strokeDasharray={`${c2 * (1 - gapFraction)} ${c2 * gapFraction}`}
        transform="rotate(168 256 256)"
      />

      {/* 3. Anel Interno - Ciano - Gaps a 135° */}
      <circle
        cx="256"
        cy="256"
        r={r3}
        fill="none"
        className="stroke-cyan-500 dark:stroke-cyan-400"
        strokeWidth="20"
        strokeLinecap="round"
        strokeDasharray={`${c3 * (1 - gapFraction)} ${c3 * gapFraction}`}
        transform="rotate(168 256 256)"
      />

      {/* 4. Play Sólido - Rotacionado a 315° (ponta para Nordeste, base perpendicular a 225°), tamanho r=110 */}
      <polygon
        points="211,171 211,341 356,256"
        className="fill-cyan-500 dark:fill-cyan-400 stroke-cyan-500 dark:stroke-cyan-400"
        strokeWidth="20"
        strokeLinejoin="round"
        transform="rotate(315 256 256)"
      />

      {/* 5. Círculo Central e Traço (Varredura a 225° / Sudoeste - passa na bissetriz da base do play) */}
      <circle cx="256" cy="256" r="18" className="fill-cyan-500 dark:fill-cyan-400" />
      <line
        x1="256"
        y1="256"
        x2="114"
        y2="398"
        className="stroke-cyan-500 dark:stroke-cyan-400"
        strokeWidth="20"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 font-bold tracking-tight text-foreground",
        className
      )}
    >
      <LogoMark className="size-[1.3em]" />
      <span>ShowRadar</span>
    </span>
  );
}
