import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { TmdbAttribution } from "@/components/layout/tmdb-attribution";
import { Button } from "@/components/ui/button";
import { getSiteUrl } from "@/lib/site";

// ---------------------------------------------------------------------------
// JSON-LD — WebSite schema for rich results
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
// Feature data
// ---------------------------------------------------------------------------
const features = [
  {
    icon: "📍",
    title: "Progresso por episódio",
    description: "Marque exatamente onde parou em cada série. Nunca perca o fio.",
  },
  {
    icon: "🎬",
    title: "Onde assistir no Brasil",
    description: "Veja imediatamente em qual streaming o título está: Netflix, Prime, Disney+, Globoplay e mais.",
  },
  {
    icon: "🔔",
    title: "Alertas de estreia",
    description: "Receba notificações instantâneas quando um novo episódio for lançado.",
  },
  {
    icon: "📅",
    title: "Radar de lançamentos",
    description: "Calendário personalizado com as estreias que você não pode perder.",
  },
  {
    icon: "👥",
    title: "Amigos e atividade",
    description: "Veja o que sua galera está assistindo e descubra indicações reais.",
  },
  {
    icon: "✨",
    title: "Recomendações personalizadas",
    description: "Sugestões baseadas no seu histórico — sem algoritmo genérico.",
  },
];

const steps = [
  {
    number: "01",
    title: "Busque e adicione",
    description: "Encontre qualquer título no nosso banco de dados e adicione à sua lista.",
  },
  {
    number: "02",
    title: "Marque o que assistiu",
    description: "Registre temporadas e episódios — seu progresso sempre atualizado.",
  },
  {
    number: "03",
    title: "Deixe o radar ligado",
    description: "Receba alertas de lançamentos e novas sugestões automaticamente.",
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function LandingPage() {
  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="flex min-h-svh flex-col">
        {/* ------------------------------------------------------------------ */}
        {/* Header                                                               */}
        {/* ------------------------------------------------------------------ */}
        <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5 md:px-6">
            <Link href="/" aria-label="ShowRadar — página inicial">
              <Logo className="text-lg" />
            </Link>

            <nav className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/login">Entrar</Link>} />
              <Button size="sm" nativeButton={false} render={<Link href="/signup">Criar conta</Link>} />
            </nav>
          </div>
        </header>

        <main className="flex-1">
          {/* ---------------------------------------------------------------- */}
          {/* Hero                                                              */}
          {/* ---------------------------------------------------------------- */}
          <section className="relative overflow-hidden py-24 md:py-36">
            {/* Decorative radar rings */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              {[900, 660, 420].map((size) => (
                <div
                  key={size}
                  style={{ width: size, height: size }}
                  className="absolute rounded-full border border-cyan-500/10 dark:border-cyan-400/8"
                />
              ))}
            </div>

            <div className="relative mx-auto max-w-4xl px-6 text-center">
              {/* Badge */}
              <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3.5 py-1 text-xs font-medium tracking-widest text-muted-foreground uppercase">
                Grátis · PWA · pt-BR
              </div>

              <h1 className="text-4xl font-bold tracking-tighter text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
                Nunca mais perca{" "}
                <span className="text-cyan-600 dark:text-cyan-400">
                  o fio da sua série.
                </span>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
                O tracker de séries e filmes definitivo para o Brasil.
                Acompanhe progresso episódio por episódio, descubra em qual streaming
                cada título está e receba alertas na hora em que você precisa.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button id="hero-cta-signup" size="lg" className="w-full sm:w-auto" nativeButton={false} render={<Link href="/signup">Criar conta grátis</Link>} />
                <Button id="hero-cta-login" variant="outline" size="lg" className="w-full sm:w-auto" nativeButton={false} render={<Link href="/login">Já tenho conta</Link>} />
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* Features                                                          */}
          {/* ---------------------------------------------------------------- */}
          <section
            id="funcionalidades"
            aria-labelledby="features-heading"
            className="border-t py-20 md:py-28"
          >
            <div className="mx-auto max-w-6xl px-6">
              <div className="mb-14 text-center">
                <h2
                  id="features-heading"
                  className="text-3xl font-bold tracking-tight md:text-4xl"
                >
                  Tudo que você precisa para nunca perder nada
                </h2>
                <p className="mt-3 text-muted-foreground md:text-lg">
                  Um conjunto de ferramentas pensado para o espectador brasileiro.
                </p>
              </div>

              {/* Bento grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {features.map((feature, i) => (
                  <article
                    key={feature.title}
                    className={[
                      "rounded-xl border bg-card p-6 transition-shadow hover:shadow-md",
                      // First card spanning 2 columns on large screens
                      i === 0 ? "lg:col-span-2" : "",
                    ]
                      .join(" ")
                      .trim()}
                  >
                    <div className="mb-3 text-3xl" aria-hidden="true">
                      {feature.icon}
                    </div>
                    <h3 className="mb-1.5 font-semibold">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* How it works                                                      */}
          {/* ---------------------------------------------------------------- */}
          <section
            id="como-funciona"
            aria-labelledby="how-heading"
            className="border-t py-20 md:py-28 bg-muted/40"
          >
            <div className="mx-auto max-w-6xl px-6">
              <div className="mb-14 text-center">
                <h2
                  id="how-heading"
                  className="text-3xl font-bold tracking-tight md:text-4xl"
                >
                  Em 3 passos simples
                </h2>
                <p className="mt-3 text-muted-foreground md:text-lg">
                  Comece em menos de um minuto, sem instalar nada.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                {steps.map((step) => (
                  <div key={step.number} className="flex flex-col items-start gap-3">
                    <span
                      className="text-4xl font-bold tracking-tighter text-cyan-600/40 dark:text-cyan-400/30"
                      aria-hidden="true"
                    >
                      {step.number}
                    </span>
                    <h3 className="text-xl font-semibold">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* Final CTA                                                         */}
          {/* ---------------------------------------------------------------- */}
          <section
            aria-labelledby="cta-heading"
            className="border-t py-20 md:py-32"
          >
            <div className="mx-auto max-w-2xl px-6 text-center">
              <h2
                id="cta-heading"
                className="text-3xl font-bold tracking-tight md:text-4xl"
              >
                Pronto para colocar suas séries no radar?
              </h2>
              <p className="mt-4 text-muted-foreground md:text-lg">
                Gratuito, sem cartão de crédito. Funciona no celular como PWA.
              </p>
              <Button
                id="bottom-cta-signup"
                size="lg"
                className="mt-8"
                nativeButton={false}
                render={<Link href="/signup">Começar agora — é grátis</Link>}
              />
            </div>
          </section>
        </main>

        {/* ------------------------------------------------------------------ */}
        {/* Footer                                                              */}
        {/* ------------------------------------------------------------------ */}
        <footer className="border-t px-6 py-6 text-sm text-muted-foreground">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
            <TmdbAttribution />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span>© {new Date().getFullYear()} ShowRadar</span>
              <Link href="/privacidade" className="hover:text-foreground transition-colors">
                Privacidade
              </Link>
              <Link href="/termos" className="hover:text-foreground transition-colors">
                Termos
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
