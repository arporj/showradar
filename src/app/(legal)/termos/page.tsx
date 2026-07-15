import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { TmdbAttribution } from "@/components/layout/tmdb-attribution";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description:
    "Leia os Termos de Uso do ShowRadar antes de criar sua conta.",
  alternates: { canonical: "/termos" },
};

export default function TermosPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-2.5 md:px-6">
          <Link href="/">
            <Logo className="text-lg" />
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-6 py-12 prose prose-neutral dark:prose-invert">
          <h1>Termos de Uso</h1>
          <p className="lead">Última atualização: julho de 2026</p>

          <h2>1. Aceitação</h2>
          <p>
            Ao criar uma conta ou usar o ShowRadar, você concorda com estes Termos. Se não
            concordar, não utilize o serviço.
          </p>

          <h2>2. O serviço</h2>
          <p>
            O ShowRadar permite rastrear séries e filmes, descobrir disponibilidade em
            serviços de streaming no Brasil e receber alertas de novos episódios. O serviço
            é gratuito e financiado por publicidade contextual.
          </p>

          <h2>3. Conta de usuário</h2>
          <ul>
            <li>Você deve ter pelo menos 13 anos para criar uma conta.</li>
            <li>Você é responsável pela segurança da sua senha.</li>
            <li>Uma conta por pessoa; contas falsas ou automatizadas são proibidas.</li>
          </ul>

          <h2>4. Conduta do usuário</h2>
          <p>É proibido:</p>
          <ul>
            <li>Usar o serviço para fins ilegais ou que violem direitos de terceiros.</li>
            <li>Fazer scraping, crawling ou acesso automatizado sem autorização escrita.</li>
            <li>Publicar conteúdo ofensivo, discriminatório ou ilegal em perfis ou listas públicas.</li>
            <li>Tentar comprometer a segurança ou disponibilidade do serviço.</li>
          </ul>

          <h2>5. Propriedade intelectual</h2>
          <p>
            O código, design e marca &ldquo;ShowRadar&rdquo; são propriedade do operador. Metadados
            de filmes e séries são fornecidos pela API do TMDB — consulte os{" "}
            <a href="https://www.themoviedb.org/terms-of-use" target="_blank" rel="noopener noreferrer">
              Termos do TMDB
            </a>{" "}
            para uso desses dados. Capas e imagens de filmes estão sujeitas aos direitos dos
            respectivos titulares.
          </p>

          <h2>6. Isenção de garantias</h2>
          <p>
            O serviço é fornecido &ldquo;como está&rdquo;. Não garantimos disponibilidade ininterrupta,
            ausência de erros ou que as informações de streaming estejam sempre atualizadas.
          </p>

          <h2>7. Limitação de responsabilidade</h2>
          <p>
            Na máxima extensão permitida por lei, o ShowRadar não se responsabiliza por danos
            indiretos, incidentais ou consequentes decorrentes do uso do serviço.
          </p>

          <h2>8. Encerramento</h2>
          <p>
            Podemos encerrar ou suspender sua conta em caso de violação destes Termos, após
            notificação prévia quando possível. Você pode encerrar sua conta a qualquer momento
            em Configurações.
          </p>

          <h2>9. Lei aplicável</h2>
          <p>
            Estes Termos são regidos pelas leis da República Federativa do Brasil. Foro de
            eleição: comarca de São Paulo/SP.
          </p>

          <h2>10. Contato</h2>
          <p>
            <a href="mailto:contato@andreric.com">contato@andreric.com</a>
          </p>
        </article>
      </main>

      <footer className="border-t px-6 py-4">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4">
          <TmdbAttribution />
          <div className="flex gap-4 text-xs text-muted-foreground">
            <Link href="/privacidade" className="hover:text-foreground">Privacidade</Link>
            <Link href="/termos" className="hover:text-foreground">Termos</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
