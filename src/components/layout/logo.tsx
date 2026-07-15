import { cn } from "@/lib/utils";

// Logotipo refinado com base na imagem de referência do usuário:
// 1. 3 anéis com cores de referência (interno ciano brilhante, médio teal/ciano médio, externo azul/slate escuro).
// 2. Gaps de todos os anéis alinhados no mesmo ângulo da linha de varredura (45°), passando pelo centro do gap.
// 3. Play sólido central significativamente ampliado, com cantos arredondados, posicionado no centro do radar.
// 4. Traço de varredura e círculo central na mesma cor (ciano brilhante da marca).
export function LogoMark({ className }: { className?: string }) {
  // Raios dos anéis com base no viewBox 512x512
  const r1 = 200; // externo
  const r2 = 140; // médio
  const r3 = 80;  // interno

  // Comprimentos das circunferências
  const c1 = 2 * Math.PI * r1;
  const c2 = 2 * Math.PI * r2;
  const c3 = 2 * Math.PI * r3;

  // Tamanho do gap em graus (aprox. 65° de abertura para o radar respirar bem)
  const gapFraction = 65 / 360;

  return (
    <svg
      viewBox="0 0 512 512"
      aria-hidden="true"
      className={cn("size-6 select-none", className)}
    >
      {/* 1. Anel Externo - Azul/Slate Escuro (Ciano escuro) */}
      <circle
        cx="256"
        cy="256"
        r={r1}
        fill="none"
        className="stroke-slate-700/80 dark:stroke-slate-800"
        strokeWidth="20"
        strokeLinecap="round"
        strokeDasharray={`${c1 * (1 - gapFraction)} ${c1 * gapFraction}`}
        transform="rotate(78 256 256)"
      />

      {/* 2. Anel Médio - Teal / Ciano Médio */}
      <circle
        cx="256"
        cy="256"
        r={r2}
        fill="none"
        className="stroke-teal-600/90 dark:stroke-teal-700"
        strokeWidth="20"
        strokeLinecap="round"
        strokeDasharray={`${c2 * (1 - gapFraction)} ${c2 * gapFraction}`}
        transform="rotate(78 256 256)"
      />

      {/* 3. Anel Interno - Ciano Brilhante */}
      <circle
        cx="256"
        cy="256"
        r={r3}
        fill="none"
        className="stroke-cyan-500 dark:stroke-cyan-400"
        strokeWidth="20"
        strokeLinecap="round"
        strokeDasharray={`${c3 * (1 - gapFraction)} ${c3 * gapFraction}`}
        transform="rotate(78 256 256)"
      />

      {/* 4. Círculo Central e Traço do Radar (Varredura a 45° passando pelo gap) */}
      <circle
        cx="256"
        cy="256"
        r="18"
        className="fill-cyan-500 dark:fill-cyan-400"
      />

      <line
        x1="256"
        y1="256"
        x2="398"
        y2="114"
        className="stroke-cyan-500 dark:stroke-cyan-400"
        strokeWidth="20"
        strokeLinecap="round"
      />

      {/* 5. Play Sólido Centralizado - Ampliado (maior que o anel interno para ser muito perceptível) e com pontas arredondadas */}
      <polygon
        points="224,200 224,312 296,256"
        className="fill-cyan-500 dark:fill-cyan-400 stroke-cyan-500 dark:stroke-cyan-400"
        strokeWidth="20"
        strokeLinejoin="round"
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
