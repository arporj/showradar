import { cn } from "@/lib/utils";

// Mesma marca do ícone PWA (public/icons/source.svg), sem o quadrado de
// fundo: os anéis herdam a cor do texto e o "sweep"/ponto usam o ciano da
// marca — um tom mais escuro no tema claro pra manter contraste.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden="true" className={cn("size-6", className)}>
      <circle
        cx="256"
        cy="256"
        r="164"
        fill="none"
        stroke="currentColor"
        strokeWidth="26"
        opacity="0.25"
      />
      <circle
        cx="256"
        cy="256"
        r="116"
        fill="none"
        stroke="currentColor"
        strokeWidth="26"
        opacity="0.45"
      />
      <circle
        cx="256"
        cy="256"
        r="68"
        fill="none"
        stroke="currentColor"
        strokeWidth="26"
        opacity="0.7"
      />
      <path
        d="M256 256 L256 92 A164 164 0 0 1 420 256 Z"
        className="fill-cyan-600 dark:fill-cyan-400"
        opacity="0.85"
      />
      <circle cx="256" cy="256" r="34" className="fill-cyan-600 dark:fill-cyan-400" />
    </svg>
  );
}

// O tamanho do símbolo acompanha o font-size do contexto (1.35em), então
// basta controlar o texto via className (text-lg, text-xl...).
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <LogoMark className="size-[1.35em]" />
      ShowRadar
    </span>
  );
}
