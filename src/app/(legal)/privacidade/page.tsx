import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { TmdbAttribution } from "@/components/layout/tmdb-attribution";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Saiba como o ShowRadar coleta, usa e protege os seus dados pessoais em conformidade com a LGPD.",
  alternates: { canonical: "/privacidade" },
};

export default function PrivacidadePage() {
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
          <h1>Política de Privacidade</h1>
          <p className="lead">
            Última atualização: julho de 2026
          </p>

          <h2>1. Quem somos</h2>
          <p>
            O ShowRadar é um serviço de rastreamento de séries e filmes operado como
            projeto independente. Dúvidas sobre esta política podem ser enviadas para{" "}
            <a href="mailto:privacidade@andreric.com">privacidade@andreric.com</a>.
          </p>

          <h2>2. Dados que coletamos</h2>
          <ul>
            <li><strong>Cadastro:</strong> nome, nome de usuário, e-mail e senha (armazenada com hash bcrypt).</li>
            <li><strong>Perfil social:</strong> foto de perfil (opcional, enviada pelo usuário).</li>
            <li><strong>Uso do serviço:</strong> histórico de visualização (séries/filmes marcados), avaliações e listas.</li>
            <li><strong>Sessão:</strong> cookie de sessão seguro (<code>HttpOnly</code>, <code>SameSite=Lax</code>) para manter o login ativo.</li>
            <li><strong>Logs:</strong> registros de acesso do servidor (IP, user-agent, timestamp) retidos por até 30 dias para segurança.</li>
          </ul>

          <h2>3. Como usamos os dados</h2>
          <ul>
            <li>Prover o serviço: autenticação, sincronização de progresso, alertas de estreia.</li>
            <li>Personalizar recomendações com base no histórico de visualização.</li>
            <li>Enviar e-mails transacionais (redefinição de senha, notificações opcionais).</li>
            <li>Medir uso agregado para melhorar o produto (Google Analytics, se habilitado).</li>
          </ul>

          <h2>4. Compartilhamento</h2>
          <p>
            Não vendemos seus dados. Compartilhamos apenas com prestadores de serviço
            essenciais: Supabase (banco de dados e armazenamento — UE/EUA), Vercel
            (hospedagem — EUA) e Brevo (e-mail transacional — UE). Todos sob cláusulas
            contratuais compatíveis com a LGPD.
          </p>

          <h2>5. Seus direitos (LGPD)</h2>
          <p>
            Você pode, a qualquer momento:
          </p>
          <ul>
            <li>Acessar ou corrigir seus dados em <strong>Configurações → Conta</strong>.</li>
            <li>Excluir sua conta e todos os dados associados em <strong>Configurações → Excluir conta</strong>.</li>
            <li>Solicitar portabilidade dos dados por e-mail.</li>
            <li>Revogar o consentimento para comunicações de marketing.</li>
          </ul>

          <h2>6. Retenção</h2>
          <p>
            Dados de conta são retidos enquanto a conta estiver ativa. Após exclusão, os
            dados são removidos dos sistemas ativos em até 30 dias e dos backups em até 90 dias.
          </p>

          <h2>7. Cookies</h2>
          <p>
            Usamos apenas cookies essenciais para autenticação. Se o Google Analytics
            estiver habilitado, cookies de medição de desempenho são adicionados — você pode
            desativá-los via extensão de opt-out do Google Analytics.
          </p>

          <h2>8. Alterações nesta política</h2>
          <p>
            Mudanças relevantes serão comunicadas por e-mail com 15 dias de antecedência.
            O uso continuado após a data de vigência implica aceitação.
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
