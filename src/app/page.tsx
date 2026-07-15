import type { Metadata } from "next";
import Link from "next/link";
import {
  BellRing,
  CalendarClock,
  ListChecks,
  MonitorPlay,
  Sparkles,
  Users,
} from "lucide-react";

import { Logo, LogoMark } from "@/components/layout/logo";
import { TmdbAttribution } from "@/components/layout/tmdb-attribution";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "ShowRadar — suas séries e filmes sob controle",
  description:
    "Acompanhe episódio por episódio, descubra em qual streaming cada título passa no Brasil, receba alertas de estreia e veja o que seus amigos estão assistindo.",
};

const FEATURES = [
  {
    icon: ListChecks,
    title: "Progresso por episódio",
    description:
      "Marque episódios ou temporadas inteiras, acompanhe barras de progresso e continue exatamente de onde parou.",
  },
  {
    icon: MonitorPlay,
    title: "Onde assistir no Brasil",
    description:
      "Veja em quais streamings cada título está disponível por aqui — sem caçar catálogo por catálogo.",
  },
  {
    icon: BellRing,
    title: "Alertas de estreia",
    description:
      "Push ou e-mail quando sai episódio novo, temporada nova ou um filme estreia — com horário de silêncio configurável.",
  },
  {
    icon: CalendarClock,
    title: "Em breve",
    description:
      "Todos os próximos episódios das suas séries num painel só, com data e contagem de dias restantes.",
  },
  {
    icon: Users,
    title: "Amigos e atividade",
    description:
      "Siga amigos, acompanhe o que eles estão assistindo e compare notas nas avaliações da comunidade.",
  },
  {
    icon: Sparkles,
    title: "Recomendações",
    description:
      "Sugestões calculadas a partir do que você concluiu — descarte o que não interessa e elas não voltam.",
  },
];

const STEPS = [
  {
    title: "Busque e adicione",
    description: "Encontre a série ou o filme e adicione à sua grade.",
  },
  {
    title: "Marque o que assistiu",
    description: "Um toque por episódio — ou a temporada inteira de uma vez.",
  },
  {
    title: "Deixe o radar ligado",
    description: "A gente avisa das estreias e sugere o próximo título.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2.5 md:px-6">
          <Logo className="text-lg" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              nativeButton={false}
              variant="ghost"
              render={<Link href="/login">Entrar</Link>}
            />
            <Button nativeButton={false} render={<Link href="/signup">Criar conta</Link>} />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 pt-16 pb-12 text-center md:pt-24">
          <LogoMark className="size-16 md:size-20" />
          <h1 className="text-4xl font-bold tracking-tight text-balance md:text-5xl">
            Nunca mais perca o fio de uma série.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground text-balance">
            O ShowRadar acompanha cada episódio que você assiste, avisa quando sai coisa nova e
            mostra em qual streaming cada título está — tudo em português, feito para o Brasil.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href="/signup">Criar conta grátis</Link>}
            />
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<Link href="/login">Entrar</Link>}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Grátis, direto no navegador — e instalável como app no celular.
          </p>
        </section>

        <section className="border-t bg-muted/30 px-6 py-14">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
              Tudo que a sua maratona precisa
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, description }) => (
                <div key={title} className="rounded-xl border bg-card p-5">
                  <Icon className="size-6 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
                  <h3 className="mt-3 font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-14">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
              Como funciona
            </h2>
            <ol className="mt-8 grid gap-6 sm:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex flex-col items-center gap-2 text-center">
                  <span className="flex size-9 items-center justify-center rounded-full bg-cyan-600 text-sm font-semibold text-white dark:bg-cyan-400 dark:text-slate-950">
                    {index + 1}
                  </span>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t px-6 py-14">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Pronto para colocar suas séries no radar?
            </h2>
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href="/signup">Começar agora — é grátis</Link>}
            />
          </div>
        </section>
      </main>

      <footer className="border-t px-6 py-4">
        <div className="mx-auto max-w-5xl">
          <TmdbAttribution />
        </div>
      </footer>
    </div>
  );
}
