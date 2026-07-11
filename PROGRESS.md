# ShowRadar — Status do Projeto

_Atualizado em: 2026-07-11_

Referência do plano completo: `C:\Users\andre\.claude\plans\quero-fazer-um-sistema-magical-kite.md`

## Visão geral

- **Núcleo (Fases 0-4): concluído e testado contra TMDb/banco reais.**
- **Fase 5: concluída** — push e e-mail (Brevo) no cron de notificações, quiet hours por fuso horário.
- **Fase 6: não iniciado.**
- **Expansão (Fases 7-13): não iniciada.**

---

## Fase 0 — Setup

- [x] Projeto Supabase dedicado (`arrc`, região São Paulo/sa-east-1), schema `showradar`
- [x] Credenciais TMDb (v4 Read Access Token)
- [x] Credenciais OAuth do Google (Google Cloud Console)
- [x] Conta Brevo (e-mail transacional) — criada, remetente `showradar@andreric.com` ("ShowRadar") verificado; **trocado de Resend para Brevo** em relação à ideia original deste documento
- [ ] Conta Stripe em modo teste — necessária na Fase 7
- [x] Repositório remoto (GitHub) — `github.com/arporj/showradar`, primeiro commit real do projeto inteiro (só existia o commit inicial do `create-next-app`) + push de `main`
- [x] Deploy (Vercel) — a primeira tentativa falhou com `Error: DATABASE_URL is not set` (build sem nenhuma env var configurada). Causa raiz descoberta depois: o import do GitHub tinha sido feito **duas vezes**, criando dois projetos Vercel distintos (`showradar` e `showradar-os9c`), ambos conectados ao mesmo repositório/branch `main` — as env vars corretas (todas as 16) tinham sido coladas no projeto errado (`showradar-os9c`), enquanto o projeto de nome limpo (`showradar`) ficou sem nenhuma e por isso sempre falhava. Corrigido apagando o projeto quebrado e renomeando o funcional para `showradar`; `NEXT_PUBLIC_APP_URL` ajustada para a URL real (`showradar.vercel.app` já pertencia a outra conta Vercel — ficou em `showradar-arporj-5977s-projects.vercel.app`); build de produção validado limpo (todas as rotas novas, incluindo `/forgot-password` e `/reset-password`, geradas sem erro)
- [x] Redirect URI de produção (`https://showradar-arporj-5977s-projects.vercel.app/api/auth/callback/google`) autorizado no Google Cloud Console — "Continuar com Google" liberado em produção

## Fase 1 — Scaffold, Auth e Schema

- [x] Next.js 16 (TypeScript, App Router, Tailwind, shadcn/ui)
- [x] Schema Drizzle completo do núcleo (`users`, `accounts`, `titles`, `seasons`, `episodes`, `user_library`, `user_episode_progress`, `push_subscriptions`, `notification_preferences`, `notification_log`, `password_reset_tokens`)
- [x] Auth.js: login por e-mail/senha (Argon2id) + Google OAuth, com logo colorido do Google no botão de ambas as telas (`components/icons/google-icon.tsx`)
- [x] Cadastro com username, nome e avatar (padrão via DiceBear ou foto do Google)
- [x] Onboarding obrigatório de username para quem entra pelo Google
- [x] Sessão via JWT com `sessionVersion` (login por credenciais não permite sessão em banco no Auth.js) — "sair de todos os dispositivos" funcionando
- [x] Proteção de rotas (proxy/middleware) separada em config "edge-safe" (sem banco) + config completa (com banco)
- [x] Rota de recuperação de loop de redirecionamento (`/api/auth/invalidate`) para sessões inválidas/órfãs
- [x] Botão "Entrar" com indicador visual de carregamento (spinner + texto "Entrando...") enquanto aguarda o Auth.js — evitava parecer travado durante logins mais lentos
- [x] Recuperação de senha ("esqueci minha senha") — `password_reset_tokens` (já existia no schema) agora usada de ponta a ponta: `/forgot-password` gera token aleatório (hash SHA-256 salvo, não o token bruto), envia link por e-mail via Brevo (`lib/email.ts`), nunca revela se o e-mail existe (mesma resposta genérica sempre, contra enumeração de contas); `/reset-password?token=...` valida o token (expira em 1h, uso único), troca a senha (Argon2id) e invalida sessões antigas (`sessionVersion + 1`, mesmo mecanismo de "sair de todos os dispositivos"). `/forgot-password` e `/reset-password` ficam acessíveis independente do usuário estar logado ou não em outro dispositivo (lista própria no `proxy.ts`, separada da lista que bloqueia `/login`/`/signup` para quem já está autenticado — sem essa distinção, clicar no link do e-mail estando logado em outra aba jogaria de volta pro dashboard)
- [x] Upload de foto de perfil — nova seção "Foto de perfil" em `/settings` (`components/settings/avatar-upload.tsx`), upload para o bucket `showradar` (público, geral do app, criado via `@supabase/supabase-js` com o `service_role` key) do Supabase Storage (mesmo projeto Supabase já usado para o banco, sem novo serviço), namespaced em `avatars/${userId}/avatar`, chave fixa sobrescrita a cada troca (sem lixo acumulando no bucket), com cache-busting via query string; `avatarSource` passa a `"upload"` (valor que já existia no enum do schema, nunca usado até agora); sessão/JWT atualizados na hora (`updateSession`) para o avatar no cabeçalho já aparecer sem precisar deslogar

## Fase 2 — Busca TMDb + Biblioteca

- [x] Cliente TMDb (busca multi, detalhe de filme/série/pessoa, temporada) com retry/backoff
- [x] Cache no banco (`titles`/`seasons`) com upsert idempotente (testado: sincronizar duas vezes não duplica)
- [x] Busca com debounce (filmes, séries e pessoas), mostrando quantas temporadas cada série tem
- [x] Busca reflete corretamente o que já está na grade do usuário ("Adicionado", mesmo em buscas novas)
- [x] Página de detalhe (sinopse, elenco clicável, lista de temporadas, pôster/capa)
- [x] Adicionar / mudar status / remover da grade, com resposta visual instantânea (otimista)
- [x] Página de pessoa (biografia + filmografia clicável)
- [x] Página "Minha Grade" com filtro por status (quero assistir / assistindo / assistido / abandonei)
- [x] Layout autenticado com navegação (Início, Buscar, Minha Grade, avatar/sair)
- [x] Botão "Voltar" preservando posição de rolagem e resultados da busca anterior
- [x] Estados de carregamento (esqueleto) nas páginas de detalhe e de pessoa
- [x] Otimizações de performance (menos consultas redundantes, consultas paralelas, ação mais leve ao adicionar da própria tela de detalhe)
- [x] Estado de carregamento (esqueleto) na página de busca e na grade — troca o texto "Buscando..." por cartões-esqueleto (`components/search/result-card-skeleton.tsx`, `user-result-card-skeleton.tsx`) enquanto a primeira página de resultados carrega em cada aba; `library/loading.tsx` cobre o Suspense automático da rota (título, pílulas de filtro e grade de pôsteres)
- [x] Atribuição obrigatória da TMDb (logo + texto legal no rodapé) — logo oficial (`public/tmdb-logo.svg`, versão "short blue" do brand kit da TMDb) + texto "Este produto usa a API do TMDB, mas não é endossado ou certificado pelo TMDB." linkando para themoviedb.org, no rodapé de todas as páginas autenticadas (`(app)/layout.tsx`) e das telas de login/signup (`(auth)/layout.tsx`); mesmo estilo do link de atribuição da JustWatch já existente (`components/layout/tmdb-attribution.tsx`)
- [x] "Onde assistir" na página de detalhe — logos dos serviços de streaming (assinatura/grátis/com anúncios) disponíveis no Brasil, via `append_to_response=watch/providers` da TMDb (dados da JustWatch), sincronizado junto com o resto do título e cacheado em `titles.watch_providers_br` (migração `0001_curvy_toad_men.sql`); link de atribuição à JustWatch incluído (exigência de uso desses dados, independente da atribuição geral da TMDb acima)

## Fase 3 — Marcação de Assistido

- [x] Buscar episódios de uma temporada (`getTvSeason`), sincronizados sob demanda ao expandir a temporada — não antecipado para todas as temporadas de uma vez (evita dezenas de chamadas à TMDb em séries longas)
- [x] Checklist de episódios assistidos por temporada, com miniatura, data de exibição e resposta otimista instantânea
- [x] "Marcar/desmarcar temporada inteira", afetando só episódios já exibidos (episódios sem data ou com data futura ficam de fora, tanto na contagem quanto na ação em massa) — disponível direto no cabeçalho da temporada, sem precisar expandi-la
- [x] Barra de progresso por temporada e barra agregada da série inteira (episódios assistidos / total) — implementada como consulta agregada (`lib/progress.ts`, `getWatchedEpisodeCounts`), não como uma `VIEW` SQL literal como o plano original cogitava; o total usa `seasons.episode_count` (já cacheado na sincronização do título), então funciona mesmo com temporadas cujos episódios ainda não foram abertos/sincronizados
- [x] Marcação por ícone animado (círculo → check preenchido, com "pop" e anel pulsante) no lugar de checkbox tradicional (`components/title/episode-watch-button.tsx`, reaproveitado tanto por episódio quanto pelo botão de temporada inteira)
- [x] Celebração em tela cheia (confete via `canvas-confetti` + cartão animado) quando o usuário termina o último episódio pendente da série **ou de uma temporada individual** — `CelebrationOverlay` generalizado para receber título/descrição (antes só tinha "Série concluída!" fixo); dispara uma única vez por transição incompleto→completo, não repete ao reabrir uma série já concluída nem ao desmarcar/remarcar o último episódio (`components/title/watch-progress.tsx`, `components/title/celebration-overlay.tsx`). O card "próximo episódio" do dashboard (`components/dashboard/next-episode-card.tsx`) também mostra essa celebração ao marcar o último episódio de uma temporada por ali — antes o episódio só sumia da lista sem nenhum feedback de conclusão; `toggleEpisodeWatched` agora retorna `{ seasonCompleted, seriesCompleted }` para viabilizar isso
- [x] "Marcar episódios anteriores?" — ao marcar um episódio (ou usar "marcar temporada inteira") deixando episódios/temporadas anteriores pendentes, pergunta via `AlertDialog` se quer marcar todos os anteriores também (episódios antes deste na mesma temporada + todas as temporadas de número menor, sempre respeitando "só episódios já exibidos"); "Não" marca só o episódio/temporada clicado, "Sim" marca tudo antes (`lib/actions/episodes.ts::markEpisodesWatchedThrough`, lógica de confirmação em `components/title/season-list.tsx`)
- [x] "Assistindo"/"Assistido" deixaram de ser botões manuais para séries — `syncLibraryStatusFromProgress` (`lib/actions/episodes.ts`) recalcula o status a cada ação de episódio (marcar/desmarcar, individual ou em massa): 1+ episódio assistido → `watching`; todos os episódios já exibidos assistidos → `completed`; zero assistidos → `plan_to_watch`. Se o título ainda não estava na grade, marcar um episódio já o adiciona. "Abandonei" é a exceção: fica travado (não é sobrescrito por atividade de episódio) até o usuário clicar manualmente em "Quero assistir" de novo. Em `LibraryStatusControl`, o botão "Quero assistir" só aparece quando o status atual é "Abandonei" (única via de volta); nos demais estados de série (`plan_to_watch`/`watching`/`completed`) mostra só "Abandonei" + "Remover" — nunca os dois botões de toggle ao mesmo tempo, e a posição de cada um é sempre a mesma. Filmes (sem sinal de episódio para derivar o status) mantêm os 4 botões manuais sempre visíveis, em ordem fixa

## Fase 4 — Painéis

- [x] Dashboard real com 3 seções condicionais (só aparecem se tiverem conteúdo): "Continuar assistindo", "Em breve" (prévia, top 6) e "Quero assistir" (status `plan_to_watch`) — cada uma com link "Ver tudo"; mantém a tela de boas-vindas original só quando a grade está 100% vazia
- [x] "Continuar assistindo" mostra episódios individuais, não a série com barra de progresso: para cada série com status `watching`, calcula o próximo episódio já exibido e ainda não assistido (pulando a temporada "Especiais"/T0, que não faz parte da ordem principal) e sincroniza sob demanda só aquela temporada (`lib/next-episode.ts::getNextEpisodesToWatch`) — marcar como assistido direto do painel (mesmo botão animado do resto do app) revalida `/dashboard`, então o card seguinte já mostra o próximo episódio da mesma série
- [x] "Em breve" (dashboard e `/upcoming`) também em nível de episódio: lista **todos** os episódios futuros já sincronizados de cada série (não só o próximo — testado com uma série real com 8 episódios futuros individuais listados), com temporada/episódio, data e dias restantes; usa `next_episode_to_air` cacheado em `titles` como fallback só para séries cuja temporada ainda não foi sincronizada (`lib/upcoming.ts::getUpcomingItems`)
- [x] "Em breve" só considera datas estritamente futuras (`> hoje`, não `>= hoje`) — um episódio com `air_date` de hoje já é tratado como disponível em todo o resto do app (checklist, "continuar assistindo"), então ficava aparecendo como "ainda não chegou" e "já disponível" ao mesmo tempo. TMDb não expõe horário de lançamento (só a data), então não há como diferenciar "hoje, mas ainda não passou da hora" sem inventar dado — ver decisão pendente sobre horários por streaming, abaixo
- [x] Página de histórico (`/history`) — agrupada por título, não por episódio: cada série aparece uma vez com barra de progresso + contagem agregada (ex.: 7/13), filmes aparecem uma vez com badge "Filme"; ordenado pela atividade mais recente de cada título (episódios de `user_episode_progress` + filmes concluídos de `user_library.watched_at`)
- [x] Componente `TitleCard` extraído (`components/library/title-card.tsx`) e reaproveitado por Biblioteca, Dashboard e Em Breve, eliminando a duplicação do cartão de pôster
- [x] Seção "Não iniciado" no dashboard — séries com status `plan_to_watch` (adicionadas mas sem nenhum episódio assistido) ganham o mesmo tratamento acionável de "Continuar assistindo" (T1E1, com botão de marcar assistido ali mesmo), em vez de sumirem num pôster genérico; `getNextEpisodesToWatch` foi generalizada para aceitar `watching` ou `plan_to_watch` (mesmo cálculo de "próximo episódio" — como status `plan_to_watch` garante zero episódios assistidos, o "próximo" é sempre o primeiro). Marcar o episódio ali promove a série para `watching` automaticamente, e ela migra para "Continuar assistindo" no recarregamento. "Quero assistir" ficou restrito a filmes (que não têm conceito de episódio), evitando duplicar séries nas duas seções
- [x] Todas as datas exibidas ao usuário padronizadas em pt-BR (`lib/format-date.ts::formatDate`) — corrigidas datas cruas em formato ISO que apareciam na lista de episódios (`season-list.tsx`) e em "Em breve" (`upcoming-row.tsx`); `history/page.tsx` migrado do `toLocaleDateString("pt-BR")` ad-hoc para o mesmo utilitário compartilhado
- [x] "Membro desde {data}" na página pública de perfil (`user/[username]/page.tsx`), usando `users.createdAt`

**Nota:** "pendências" do plano virou a seção "Quero assistir" no dashboard (mesmo rótulo já usado no filtro de status da Biblioteca) em vez de um termo novo — mantém o vocabulário do produto consistente.

## Fase 5 — Notificações (concluída: push e e-mail no cron, quiet hours por fuso horário)

- [x] Chaves VAPID geradas (`npx web-push generate-vapid-keys`) e em `.env.local`/`.env.example` (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_SUBJECT`)
- [x] Service Worker mínimo (`public/sw.js`) — só o necessário para push (evento `push` → `showNotification`, `notificationclick` → foca/abre a página do título); não é o Service Worker completo de PWA/offline da Fase 6, mas convive com ele depois sem conflito
- [x] Assinatura de push no navegador — tela `/settings`, botão "Ativar" (`components/settings/push-toggle.tsx`) registra o Service Worker, pede permissão, chama `pushManager.subscribe` e salva em `push_subscriptions` via `lib/actions/notifications.ts::subscribeToPush`; "Desativar" remove a assinatura no navegador e no banco
- [x] Preferências de notificação — tela `/settings` com toggles "Novo episódio" e "Nova temporada" (`notification_preferences.notify_new_episode`/`notify_new_season`), salvos com resposta otimista; `pushEnabled` é controlado implicitamente por assinar/cancelar (sem um terceiro botão redundante para a mesma coisa)
- [x] Job diário (`app/api/cron/check-new-releases/route.ts`, protegido por `Authorization: Bearer $CRON_SECRET`) — para cada título rastreado por algum usuário (status ≠ abandonei), resincroniza com a TMDb (`syncTitleFromTmdb`) e verifica se `last_episode_to_air`/`release_date` bate com hoje; classifica episódio 1 como "nova temporada", os demais como "novo episódio"; `vercel.json` agenda `0 12 * * *` (9h BRT) — só dispara de fato depois do deploy na Vercel (pendente, ver Fase 0); testável manualmente via `curl` com o bearer secret desde já
- [x] Deduplicação — `dedup_key` único em `notification_log` (`push:<userId>:<titleId>:<tipo>:<temporada-episódio ou data>`), checado antes de enviar e protegido por `onConflictDoNothing` como rede de segurança extra a nível de banco
- [x] Assinaturas mortas (404/410) removidas automaticamente após tentativa de envio falhar (`lib/push.ts` classifica o erro; a rota do cron apaga a linha de `push_subscriptions`)
- [x] Exclusão de talk shows/jornalismo dos alertas por episódio — gêneros TMDb "Talk" (10767) e "News" (10763) pulam notificação de tipo "novo episódio" (nova temporada e lançamento de filme não são afetados)
- [x] Envio de e-mail pelo cron de notificações (novo episódio/temporada/lançamento de filme) — reaproveita a infra da Fase 1 (`lib/email.ts`, Brevo); cada usuário elegível agora é checado nos dois canais independentemente (`emailEnabled`/`pushEnabled`), cada um com seu próprio `dedup_key` (`email:...` vs `push:...`) e sua própria linha em `notification_log` (`channel: "email"`), reaproveitando o mesmo título/corpo/link já calculados para o push — sem duplicar a lógica de mensagem por canal. Template em `lib/email.ts::notificationEmailHtml`
- [x] Quiet hours / fuso horário por usuário — nova seção "Horário de silêncio" em `/settings` (`components/settings/quiet-hours-form.tsx`): toggle liga/desliga o período, dois campos de hora (início/fim, aceita virar a meia-noite, ex. 22:00–07:00) e um seletor de fuso horário limitado a 4 fusos brasileiros (`lib/quiet-hours.ts::TIMEZONE_OPTIONS`) — suficiente para um app 100% pt-BR, sem precisar de um seletor de fuso global. `lib/quiet-hours.ts::isWithinQuietHours` calcula o horário local do usuário via `Intl.DateTimeFormat` e é checado no cron antes de mandar por qualquer canal (push ou e-mail) — usuário com os dois campos em branco (padrão) nunca entra em silêncio

**Como testei:** validei a query estendida (`users` + `notification_preferences`, incluindo as colunas novas) direto contra o banco real; testei `isWithinQuietHours` com os três casos (sem horário configurado, dentro da janela com virada de meia-noite, fora da janela) e todos bateram com o esperado; enviei uma prévia real do novo template de e-mail de notificação (`notificationEmailHtml`) via Brevo para validação visual; rodei `GET /api/cron/check-new-releases` contra o dev server (200, sem eventos reais no dia do teste, então o envio em si não foi exercitado ao vivo — mas a consulta que alimenta esse envio foi validada isoladamente); `npm run build` (produção) e `npx tsc --noEmit` sem erros após as mudanças.

## Fase 6 — PWA + Polimento Premium (não iniciada)

- [ ] Manifest, ícones, Service Worker (instalável)
- [ ] Modal de instalação para iOS (detecção de dispositivo)
- [ ] Alternância clara de modo escuro/claro (variáveis já existem via shadcn, falta o botão)
- [ ] Responsividade revisada (mobile) em todas as telas
- [ ] Auditoria completa de estados vazios/erro
- [x] Atribuição da TMDb — feita, ver Fase 2

---

## Fases de Expansão (7-13) — nenhuma iniciada

| Fase | Conteúdo | Status |
|---|---|---|
| 7 | Monetização (anúncios discretos + assinatura Stripe para remover anúncios) | Não iniciada |
| 8 | Social (perfis públicos, seguir, feed de atividade) | Não iniciada |
| 9 | Avaliações públicas (nota + texto por título) | Não iniciada |
| 10 | Recomendação (baseada em `/recommendations` da TMDb) | Não iniciada |
| 11 | Multi-idioma (UI + metadados localizados) | Não iniciada |
| 12 | Sincronização offline-first | Não iniciada |
| 13 | Importação de histórico (Trakt/Letterboxd/IMDb) | Baixa prioridade, sem compromisso de cronograma |

*(Fora de escopo por enquanto: wrapper nativo Capacitor + push nativo para lojas de app.)*

---

## Decisões técnicas que valem lembrar

- **Nome do app:** ShowRadar.
- **Banco:** Supabase dedicado `arrc` (São Paulo) — migrado de um projeto inicial no Canadá após latência de ~300ms/consulta se mostrar perceptível; hoje ~50-115ms.
- **Autenticação:** Auth.js próprio (Credentials + Google), não Supabase Auth — por isso sessão é via JWT (com `sessionVersion` para revogação), não sessão em banco.
- **Cache de metadados:** `titles`/`seasons` são atualizados a cada visita à página de detalhe (write-through), não só na primeira vez.
- **E-mail transacional:** Brevo, não Resend como cogitado originalmente — conta já criada e remetente verificado antes de qualquer código ser escrito, então a troca não teve custo.
- **Storage de avatar:** Supabase Storage (bucket `showradar`, público, de uso geral — não só avatares) em vez de um serviço novo (Vercel Blob, S3) — reaproveita o mesmo projeto Supabase já usado para o banco, sem depender do deploy na Vercel estar pronto.

## Bugs encontrados e corrigidos

- Botão "Adicionar" reaparecendo como não-adicionado em buscas novas → busca agora consulta a grade do usuário.
- Botão "Adicionar" demorado (2-3s) → resposta otimista instantânea + removida uma busca redundante à TMDb.
- Loop infinito de redirecionamento login ↔ dashboard após a migração de banco (sessão antiga apontando para usuário inexistente) → rota `/api/auth/invalidate` limpa a sessão corretamente.
- E-mail de teste (Brevo) chegando com acentos corrompidos (mojibake, `�` no lugar de "ç"/"ã"/"é") → causa era passar o corpo da requisição com acentos direto como argumento de linha de comando do shell, que não preservava UTF-8; corrigido escrevendo o payload num arquivo UTF-8 e enviando com `curl --data-binary @arquivo`.
- Marcar como assistido o último episódio de uma temporada pelo card "próximo episódio" do dashboard apenas fazia o item sumir da lista, sem nenhuma celebração — corrigido generalizando o `CelebrationOverlay` para disparar por temporada, não só quando a série inteira termina (ver Fase 3).
- Deploy na Vercel sempre falhando com `DATABASE_URL is not set` mesmo após configurar as env vars → import do GitHub tinha sido feito duas vezes sem perceber, criando dois projetos Vercel separados; as env vars foram parar no projeto errado. Corrigido apagando o duplicado quebrado e renomeando o funcional (ver Fase 0).
