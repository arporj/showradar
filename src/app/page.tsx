import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { TmdbAttribution } from "@/components/layout/tmdb-attribution";
import { Button } from "@/components/ui/button";
import { getSiteUrl } from "@/lib/site";

// ---------------------------------------------------------------------------
// Componentes das Três Opções de Logo para Comparação Lado a Lado
// ---------------------------------------------------------------------------

export function LogoVariant1({ className }: { className?: string }) {
  const r1 = 200; // externo
  const r2 = 140; // médio
  const r3 = 80;  // interno

  const c1 = 2 * Math.PI * r1;
  const c2 = 2 * Math.PI * r2;
  const c3 = 2 * Math.PI * r3;

  const gapFraction = 65 / 360;

  return (
    <svg viewBox="0 0 512 512" aria-hidden="true" className={className}>
      {/* 1. Anel Externo - Slate - Gap a 135° (superior esquerdo) */}
      <circle
        cx="256"
        cy="256"
        r={r1}
        fill="none"
        className="stroke-slate-300 dark:stroke-slate-800"
        strokeWidth="20"
        strokeLinecap="round"
        strokeDasharray={`${c1 * (1 - gapFraction)} ${c1 * gapFraction}`}
        transform="rotate(168 256 256)"
      />

      {/* 2. Anel Médio - Teal - Gap a 135° */}
      <circle
        cx="256"
        cy="256"
        r={r2}
        fill="none"
        className="stroke-teal-500/80 dark:stroke-teal-700/80"
        strokeWidth="20"
        strokeLinecap="round"
        strokeDasharray={`${c2 * (1 - gapFraction)} ${c2 * gapFraction}`}
        transform="rotate(168 256 256)"
      />

      {/* 3. Anel Interno - Ciano - Gap a 135° */}
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

      {/* 4. Play Sólido - Tamanho reduzido para ir até a metade (r=110) */}
      <polygon
        points="211,171 211,341 356,256"
        className="fill-cyan-500 dark:fill-cyan-400 stroke-cyan-500 dark:stroke-cyan-400"
        strokeWidth="20"
        strokeLinejoin="round"
      />

      {/* 5. Círculo Central e Traço (Varredura a 45°) */}
      <circle cx="256" cy="256" r="18" className="fill-cyan-500 dark:fill-cyan-400" />
      <line
        x1="256"
        y1="256"
        x2="398"
        y2="114"
        className="stroke-cyan-500 dark:stroke-cyan-400"
        strokeWidth="20"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LogoVariant2({ className }: { className?: string }) {
  const r1 = 200; // externo
  const r2 = 140; // médio
  const r3 = 80;  // interno

  return (
    <svg viewBox="0 0 512 512" aria-hidden="true" className={className}>
      {/* 1. Anel Externo - Slate completo */}
      <circle
        cx="256"
        cy="256"
        r={r1}
        fill="none"
        className="stroke-slate-300 dark:stroke-slate-800"
        strokeWidth="20"
      />

      {/* 2. Anel Médio - Teal completo */}
      <circle
        cx="256"
        cy="256"
        r={r2}
        fill="none"
        className="stroke-teal-500/80 dark:stroke-teal-700/80"
        strokeWidth="20"
      />

      {/* 3. Anel Interno - Ciano completo */}
      <circle
        cx="256"
        cy="256"
        r={r3}
        fill="none"
        className="stroke-cyan-500 dark:stroke-cyan-400"
        strokeWidth="20"
      />

      {/* 4. Play Sólido - Encosta no círculo médio (r2 = 140) com a mesma cor da segunda linha (Teal) */}
      <polygon
        points="196,145 196,367 386,256"
        className="fill-teal-500/85 dark:fill-teal-700/85 stroke-teal-500/85 dark:stroke-teal-700/85"
        strokeWidth="20"
        strokeLinejoin="round"
      />

      {/* 5. Círculo Central e Traço (Renderizados por último) */}
      <circle cx="256" cy="256" r="18" className="fill-cyan-500 dark:fill-cyan-400" />
      <line
        x1="256"
        y1="256"
        x2="398"
        y2="114"
        className="stroke-cyan-500 dark:stroke-cyan-400"
        strokeWidth="20"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LogoVariant3({ className }: { className?: string }) {
  const r1 = 200; // externo
  const r2 = 140; // médio
  const r3 = 80;  // interno

  const c1 = 2 * Math.PI * r1;
  const c2 = 2 * Math.PI * r2;
  const c3 = 2 * Math.PI * r3;

  const gapFraction = 65 / 360;

  return (
    <svg viewBox="0 0 512 512" aria-hidden="true" className={className}>
      {/* 1. Anel Externo - Slate - Gap a 135° */}
      <circle
        cx="256"
        cy="256"
        r={r1}
        fill="none"
        className="stroke-slate-300 dark:stroke-slate-800"
        strokeWidth="20"
        strokeLinecap="round"
        strokeDasharray={`${c1 * (1 - gapFraction)} ${c1 * gapFraction}`}
        transform="rotate(168 256 256)"
      />

      {/* 2. Anel Médio - Teal - Gap a 135° */}
      <circle
        cx="256"
        cy="256"
        r={r2}
        fill="none"
        className="stroke-teal-500/80 dark:stroke-teal-700/80"
        strokeWidth="20"
        strokeLinecap="round"
        strokeDasharray={`${c2 * (1 - gapFraction)} ${c2 * gapFraction}`}
        transform="rotate(168 256 256)"
      />

      {/* 3. Anel Interno - Ciano - Gap a 135° */}
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

      {/* 4. Play Sólido - Rotacionado para cima (Seta apontando para o topo), tamanho até a metade (r=110) */}
      <polygon
        points="201,301 311,301 256,156"
        className="fill-cyan-500 dark:fill-cyan-400 stroke-cyan-500 dark:stroke-cyan-400"
        strokeWidth="20"
        strokeLinejoin="round"
      />

      {/* 5. Círculo Central e Traço (Varredura centralizada no gap a 135°) */}
      <circle cx="256" cy="256" r="18" className="fill-cyan-500 dark:fill-cyan-400" />
      <line
        x1="256"
        y1="256"
        x2="114"
        y2="114"
        className="stroke-cyan-500 dark:stroke-cyan-400"
        strokeWidth="20"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// JSON-LD — WebSite schema para SEO
// ---------------------------------------------------------------------------
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "ShowRadar",
  url: getSiteUrl(),
  description:
    "Tracker de séries e filmes para o Brasil. Acompanhe episódios, descubra onde assistir e receba alertas de estreia.",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${getSiteUrl()}/search?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------
export const metadata: Metadata = {
  title: "ShowRadar — suas séries e filmes sob controle",
  description:
    "Acompanhe episódio por episódio, descubra em qual streaming cada título passa no Brasil, receba alertas de estreia e veja o que seus amigos estão assistindo. Grátis, PWA.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    title: "ShowRadar — suas séries e filmes sob controle",
    description:
      "O tracker de séries e filmes definitivo para o Brasil. Grátis e sem instalar — funciona como PWA no celular.",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "ShowRadar — suas séries e filmes sob controle",
    description:
      "Tracker de séries e filmes para o Brasil. Grátis, PWA, feito em pt-BR.",
  },
};

// ---------------------------------------------------------------------------
// Funcionalidades (Features)
// ---------------------------------------------------------------------------
const features = [
  {
    icon: "📍",
    title: "Progresso por episódio",
    description: "Marque exatamente onde parou em cada série. O controle do seu tempo de tela, episódio por episódio.",
    className: "lg:col-span-2",
  },
  {
    icon: "🎬",
    title: "Onde assistir no Brasil",
    description: "Saiba instantaneamente se está na Netflix, Prime, Disney+, Globoplay ou outros serviços nacionais.",
    className: "lg:col-span-1",
  },
  {
    icon: "🔔",
    title: "Alertas de estreia",
    description: "Fique por dentro! Receba avisos no exato momento em que novos episódios ou temporadas forem lançados.",
    className: "lg:col-span-1",
  },
  {
    icon: "📅",
    title: "Radar de lançamentos",
    description: "Um calendário visual personalizado montado a partir das séries e programas que você acompanha.",
    className: "lg:col-span-1",
  },
  {
    icon: "👥",
    title: "Amigos e atividade",
    description: "Acompanhe o histórico dos seus amigos, curta reviews e veja as reações sem o ruído das redes tradicionais.",
    className: "lg:col-span-1",
  },
  {
    icon: "✨",
    title: "Recomendações inteligentes",
    description: "Descubra novas produções com base real no seu gosto pessoal, analisando seu histórico e notas atribuídas.",
    className: "lg:col-span-3",
  },
];

const steps = [
  {
    number: "01",
    title: "Busque e adicione",
    description: "Encontre qualquer título no nosso vasto acervo atualizado constantemente.",
  },
  {
    number: "02",
    title: "Marque seu progresso",
    description: "Registre as temporadas e episódios assistidos para manter o painel sempre em dia.",
  },
  {
    number: "03",
    title: "Receba notificações",
    description: "Fique sossegado. O radar monitora estreias e te avisa de novidades automaticamente.",
  },
];

// ---------------------------------------------------------------------------
// Componente da Página
// ---------------------------------------------------------------------------
export default function LandingPage() {
  return (
    <>
      {/* JSON-LD de SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="flex min-h-svh flex-col bg-slate-50/70 text-slate-900 transition-colors duration-300 dark:bg-background dark:text-foreground">
        {/* ------------------------------------------------------------------ */}
        {/* Header (Top Bar)                                                   */}
        {/* ------------------------------------------------------------------ */}
        <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur-md transition-colors dark:border-border/60 dark:bg-background/80">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
            <Link href="/" aria-label="ShowRadar — Página Inicial" className="hover:opacity-90 transition-opacity">
              <Logo className="text-xl" />
            </Link>

            <nav className="flex items-center gap-3">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-600 dark:text-slate-300"
                nativeButton={false}
                render={<Link href="/login">Entrar</Link>}
              />
              <Button
                size="sm"
                className="bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white"
                nativeButton={false}
                render={<Link href="/signup">Criar conta</Link>}
              />
            </nav>
          </div>
        </header>

        <main className="flex-1">
          {/* ---------------------------------------------------------------- */}
          {/* Seção Temporária: Comparação de Logos Lado a Lado               */}
          {/* ---------------------------------------------------------------- */}
          <section className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-border/50 py-10">
            <div className="mx-auto max-w-6xl px-6 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                🔎 Comparação de Logotipos
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                Analise os três conceitos de logo abaixo em modo claro e escuro.
              </p>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Opção 1 */}
                <div className="flex flex-col items-center p-6 border rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-border/60">
                  <span className="mb-4 inline-flex items-center rounded-full bg-cyan-100 dark:bg-cyan-950/50 px-3 py-1 text-xs font-semibold text-cyan-800 dark:text-cyan-400">
                    Opção 1
                  </span>
                  <p className="text-xs text-slate-500 mb-6">Gap no topo à esquerda (135°) · Play vai até a metade entre o centro e a segunda linha (r=110) · Vetor a 45°</p>
                  <LogoVariant1 className="size-44 text-cyan-500" />
                </div>

                {/* Opção 2 */}
                <div className="flex flex-col items-center p-6 border rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-border/60">
                  <span className="mb-4 inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-950/50 px-3 py-1 text-xs font-semibold text-blue-800 dark:text-blue-400">
                    Opção 2
                  </span>
                  <p className="text-xs text-slate-500 mb-6">Sem aberturas · Play na cor do anel médio (Teal) · Círculo central POR CIMA do play</p>
                  <LogoVariant2 className="size-44 text-cyan-500" />
                </div>

                {/* Opção 3 */}
                <div className="flex flex-col items-center p-6 border rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-border/60">
                  <span className="mb-4 inline-flex items-center rounded-full bg-teal-100 dark:bg-teal-950/50 px-3 py-1 text-xs font-semibold text-teal-800 dark:text-teal-400">
                    Opção 3
                  </span>
                  <p className="text-xs text-slate-500 mb-6">Gaps a 135° · Vetor a 135° no gap · Play rotacionado anti-horário apontando para CIMA (▲)</p>
                  <LogoVariant3 className="size-44 text-cyan-500" />
                </div>
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* Hero Section                                                     */}
          {/* ---------------------------------------------------------------- */}
          <section className="relative overflow-hidden px-6 py-20 sm:py-32 lg:px-8 text-center">
            {/* Concentric Sonar Background Decor */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-60 dark:opacity-40"
            >
              {[800, 560, 320].map((size, idx) => (
                <div
                  key={size}
                  style={{ width: size, height: size }}
                  className={[
                    "absolute rounded-full border border-dashed",
                    idx === 0 ? "border-slate-300/60 dark:border-cyan-900/10" : "",
                    idx === 1 ? "border-cyan-200/50 dark:border-cyan-800/10 animate-[pulse_6s_infinite]" : "",
                    idx === 2 ? "border-cyan-300/40 dark:border-cyan-600/10" : "",
                  ].join(" ").trim()}
                />
              ))}
            </div>

            <div className="relative mx-auto max-w-3xl">
              {/* Badge */}
              <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-cyan-100 bg-cyan-50/50 px-4 py-1 text-xs font-semibold tracking-wider text-cyan-700 uppercase dark:border-cyan-900/30 dark:bg-cyan-950/20 dark:text-cyan-400">
                Grátis · PWA · pt-BR
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl md:text-6xl lg:text-7xl dark:text-white leading-tight">
                Nunca mais perca{" "}
                <span className="bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent dark:from-cyan-400 dark:to-blue-400">
                  o fio da sua série.
                </span>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-400 md:text-xl leading-relaxed">
                O tracker de séries e filmes definitivo para o público brasileiro.
                Acompanhe seu progresso episódio por episódio, descubra onde assistir e receba alertas personalizados.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row max-w-md mx-auto">
                <Button
                  id="hero-cta-signup"
                  size="lg"
                  className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white font-semibold shadow-lg shadow-cyan-600/15 dark:shadow-none"
                  nativeButton={false}
                  render={<Link href="/signup">Criar conta grátis</Link>}
                />
                <Button
                  id="hero-cta-login"
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto border-slate-200 dark:border-border hover:bg-slate-100 dark:hover:bg-muted/50 font-semibold"
                  nativeButton={false}
                  render={<Link href="/login">Entrar</Link>}
                />
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* Features Section (Bento Grid)                                     */}
          {/* ---------------------------------------------------------------- */}
          <section
            id="funcionalidades"
            aria-labelledby="features-heading"
            className="border-t border-slate-100 dark:border-border/60 py-20 md:py-28"
          >
            <div className="mx-auto max-w-6xl px-6">
              <div className="mb-16 text-center max-w-2xl mx-auto">
                <h2
                  id="features-heading"
                  className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-4xl"
                >
                  Tudo que você precisa para nunca perder nada
                </h2>
                <p className="mt-4 text-slate-600 dark:text-slate-400 md:text-lg">
                  Um conjunto robusto de ferramentas sob medida para o espectador brasileiro.
                </p>
              </div>

              {/* Bento Grid layout */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {features.map((feature) => (
                  <article
                    key={feature.title}
                    className={[
                      "group relative rounded-2xl border border-slate-100 bg-white p-8 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-100/50 dark:border-border/50 dark:bg-card dark:hover:shadow-none",
                      feature.className || "",
                    ]
                      .join(" ")
                      .trim()}
                  >
                    <div
                      className="mb-6 flex size-12 items-center justify-center rounded-xl bg-cyan-50 text-2xl transition-colors group-hover:bg-cyan-100 dark:bg-cyan-950/30 dark:group-hover:bg-cyan-900/30"
                      aria-hidden="true"
                    >
                      {feature.icon}
                    </div>
                    <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* How It Works Section                                             */}
          {/* ---------------------------------------------------------------- */}
          <section
            id="como-funciona"
            aria-labelledby="how-heading"
            className="border-t border-slate-100 dark:border-border/60 py-20 md:py-28 bg-slate-100/40 dark:bg-muted/10"
          >
            <div className="mx-auto max-w-6xl px-6">
              <div className="mb-16 text-center max-w-2xl mx-auto">
                <h2
                  id="how-heading"
                  className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-4xl"
                >
                  Em 3 passos simples
                </h2>
                <p className="mt-4 text-slate-600 dark:text-slate-400 md:text-lg">
                  Sem burocracia. Crie sua conta e organize suas listas em instantes.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
                {steps.map((step) => (
                  <div key={step.number} className="flex flex-col items-start gap-4 p-4">
                    <span
                      className="text-5xl font-extrabold tracking-tighter text-cyan-600/20 dark:text-cyan-400/20 font-mono"
                      aria-hidden="true"
                    >
                      {step.number}
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {step.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* Final CTA Section                                                */}
          {/* ---------------------------------------------------------------- */}
          <section
            aria-labelledby="cta-heading"
            className="px-6 py-20 md:py-32"
          >
            <div className="mx-auto max-w-4xl rounded-3xl bg-gradient-to-br from-cyan-50/50 via-white to-blue-50/30 dark:from-slate-900 dark:via-background dark:to-cyan-950/20 border border-cyan-100/40 dark:border-cyan-900/20 p-10 md:p-16 text-center shadow-sm">
              <h2
                id="cta-heading"
                className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-4xl"
              >
                Pronto para colocar suas séries no radar?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-slate-600 dark:text-slate-400 md:text-lg">
                Gratuito para sempre. Funciona direto no navegador do celular como PWA instalável.
              </p>
              <Button
                id="bottom-cta-signup"
                size="lg"
                className="mt-8 bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white font-semibold px-8 py-6 rounded-xl shadow-lg shadow-cyan-600/15 dark:shadow-none"
                nativeButton={false}
                render={<Link href="/signup">Começar agora — é grátis</Link>}
              />
            </div>
          </section>
        </main>

        {/* ------------------------------------------------------------------ */}
        {/* Footer                                                             */}
        {/* ------------------------------------------------------------------ */}
        <footer className="border-t border-slate-100 dark:border-border/60 bg-white dark:bg-background px-6 py-8 text-sm text-slate-500 dark:text-slate-400">
          <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-6">
            <TmdbAttribution />
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <span>© {new Date().getFullYear()} ShowRadar</span>
              <Link href="/privacidade" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
                Privacidade
              </Link>
              <Link href="/termos" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
                Termos
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
