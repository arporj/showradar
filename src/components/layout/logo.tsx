import { cn } from "@/lib/utils";

// Logotipo responsivo e estilizado conforme os requisitos de design:
// 1. 3 anéis com cores diferentes (externo em slate/cinza, médio em teal, interno em azul).
// 2. Abertura do radar (gaps a 315°) separada da linha de varredura (traço a 135°).
// 3. Traço do radar e círculo central na mesma cor (ciano da marca).
// 4. Play sólido central com pontas arredondadas e ligeiramente maior que o círculo central.
export function LogoMark({ className }: { className?: string }) {
  // Raios dos anéis
  const r1 = 164; // externo
  const r2 = 116; // médio
  const r3 = 68;  // interno

  // Comprimentos das circunferências
  const c1 = 2 * Math.PI * r1;
  const c2 = 2 * Math.PI * r2;
  const c3 = 2 * Math.PI * r3;

  return (
    <svg
      viewBox="0 0 512 512"
      aria-hidden="true"
      className={cn("size-6 select-none", className)}
    >
      {/* 1. Anel Externo - Slate/Cinza - Gap a 315° */}
      <circle
        cx="256"
        cy="256"
        r={r1}
        fill="none"
        className="stroke-slate-400/70 dark:stroke-slate-500/70"
        strokeWidth="24"
        strokeLinecap="round"
        strokeDasharray={`${c1 * 0.82} ${c1 * 0.18}`}
        transform="rotate(-20 256 256)"
      />

      {/* 2. Anel Médio - Teal - Gap a 315° */}
      <circle
        cx="256"
        cy="256"
        r={r2}
        fill="none"
        className="stroke-teal-500 dark:stroke-teal-400/80"
        strokeWidth="24"
        strokeLinecap="round"
        strokeDasharray={`${c2 * 0.82} ${c2 * 0.18}`}
        transform="rotate(-20 256 256)"
      />

      {/* 3. Anel Interno - Azul - Gap a 315° */}
      <circle
        cx="256"
        cy="256"
        r={r3}
        fill="none"
        className="stroke-blue-500 dark:stroke-blue-400/80"
        strokeWidth="24"
        strokeLinecap="round"
        strokeDasharray={`${c3 * 0.82} ${c3 * 0.18}`}
        transform="rotate(-20 256 256)"
      />

      {/* 4. Círculo Central e Traço do Radar (Varredura a 135°) */}
      {/* Círculo central sob o play */}
      <circle
        cx="256"
        cy="256"
        r="28"
        className="fill-cyan-600 dark:fill-cyan-400"
      />

      {/* Traço do radar - mesma cor ciano do círculo central */}
      <line
        x1="256"
        y1="256"
        x2="372"
        y2="372"
        className="stroke-cyan-600 dark:stroke-cyan-400"
        strokeWidth="24"
        strokeLinecap="round"
      />

      {/* 5. Play Sólido - um pouco maior que o círculo central (raio 28 = diâmetro 56), com pontas arredondadas */}
      {/* Triângulo com base x=228, altura se estendendo até x=292 (largura 64) */}
      <polygon
        points="228,216 228,296 296,256"
        className="fill-cyan-600 dark:fill-cyan-400 stroke-cyan-600 dark:stroke-cyan-400"
        strokeWidth="12"
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
