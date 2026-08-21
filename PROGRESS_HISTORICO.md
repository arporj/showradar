# ShowRadar — Histórico (tudo que já foi construído)

_Extraído de `PROGRESS.md` em 2026-07-24: aquele arquivo estava ficando grande demais de tanto acumular fase concluída atrás de fase concluída, então este arquivo passou a guardar o registro completo (o quê, por quê, como foi testado) de tudo que já está pronto e em produção. `PROGRESS.md` ficou só com o que falta fazer — comece por lá; volte aqui quando precisar de contexto de como algo específico foi implementado._

Referência do plano completo: `C:\Users\andre\.claude\plans\quero-fazer-um-sistema-magical-kite.md`

## Visão geral

- **Núcleo (Fases 0-4): concluído e testado contra TMDb/banco reais.**
- **Fase 5: concluída** — push e e-mail (Brevo) no cron de notificações, quiet hours por fuso horário.
- **Fase 6: concluída** — PWA instalável, tema escuro/claro, responsividade mobile, telas de erro/404.
- **Fase 8: concluída** — Fase 7 (Monetização) pulada a pedido do usuário; boa parte do social (busca de usuários, seguir/aceitar, perfil público, privacidade) já tinha sido construída junto do núcleo sem ser documentada aqui; esta rodada fechou busca por e-mail exato, contagem por aba na busca e o feed de atividade dos amigos.
- **Amigos, Área Administrativa e Motor de Descoberta: concluído** — fora do plano original (pedido avulso do usuário): lista de amigos com follow mútuo automático, área `/admin` (usuários, plano, suspensão, métricas) e 4 das 5 vitrines de descoberta na tela de busca (a 5ª, "Recomendados para você"/Fase 10, entrou depois — ver abaixo).
- **Fase 10 (Recomendação): concluída** — vitrine "Recomendados para você" (TMDb `/recommendations`+`/similar` a partir dos títulos concluídos pelo usuário) em `/search` (não no `/dashboard` como o plano original previa — mudança a pedido do usuário), com três complementos depois: variação a cada carregamento (pool + sorteio, em vez de sempre os mesmos 10 na mesma ordem), descarte permanente por título (tabela `dismissed_recommendations`, botão "X" no card) e a seção "Títulos parecidos" ao final da página de detalhe do título (o único item que de fato faltava do plano original).
- **Fase 9 (Avaliações públicas): concluída** — nota (5 estrelas com meia-estrela) + texto opcional por título, sempre públicas, reaproveitando `user_library.personal_rating`; "Maiores notas da semana" do motor de descoberta trocou o placeholder (nota TMDb) pela nota média real da comunidade.
- **Complemento — episódios especiais, ordenação da grade e status clicável: concluído** — temporada 0 (especiais) deixou de contar pra decidir se uma série está "Assistida"; corrigido bug que impedia marcar especiais como assistidos (episódios sem `air_date` ficavam com o botão travado, sem erro nenhum); `/library` sem filtro agrupa por status (assistindo → quero assistir → assistido → abandonei); o status atual de um título não aparece mais como card clicável ao lado dos outros.
- **Complemento — navegação do admin e contraste no modo claro: concluído** — `/admin` virou a própria lista de usuários (antes um dashboard separado, sem volta pra quem entrava em `/admin/users` ou num usuário — o app roda como PWA instalado, sem chrome de navegador), com abas "Usuários"/"Séries" e botão de voltar na página de um usuário; texto cinza (`--muted-foreground`) escurecido no tema claro pra melhor legibilidade (o escuro já estava bom).
- **Complemento — agrupamento de episódios em "Atividade": concluído** — quando um amigo maratona vários episódios (ou temporadas inteiras) da mesma série, o feed agora colapsa tudo numa única linha expansível (usuário+série), em vez de uma linha por episódio dominando a lista e escondendo a atividade de outros amigos.
- **Identidade visual, landing page e correção da fonte global: concluído** — logo (radar) agora em todo o app (header, auth, landing), landing page real com features/CTA, redirect de `/` pro dashboard quando logado, e correção de um bug que fazia o app inteiro renderizar na fonte serifada padrão do navegador — ver complemento próprio abaixo.
- **Landing editorial clara, SEO/Google Ads, rotas legais e logo oficial: concluído** — rodada conduzida pelo próprio usuário via Gemini CLI (2026-07-15, 12 commits): landing `/` redesenhada no estilo editorial claro, SEO completo (metadataBase, OG/Twitter, canonical, robots.ts, sitemap.ts, imagem OG dinâmica, JSON-LD), páginas `/privacidade` e `/termos`, Google tag preparada atrás de `NEXT_PUBLIC_GOOGLE_TAG_ID` (conta do Ads ainda não existe), logout → landing, e a arte definitiva do logo escolhida entre opções comparadas ao vivo na própria landing ("opção 3"). As **5 pendências mapeadas ao documentar** (a mais séria: a imagem OG atrás do login para crawlers) foram **todas resolvidas na mesma data**, incluindo a propagação da arte nova pra favicon/ícones PWA/imagem OG e a instrumentação da conversão `sign_up` — ver complemento próprio abaixo.
- **Fase 12 (Sincronização offline): concluída** — fila de mutações em IndexedDB (marcar episódio/temporada assistido, mudar status da grade) enfileirada quando offline e sincronizada automaticamente ao reconectar; `/dashboard` e `/library` continuam abrindo offline via cache HTTP no Service Worker (não um snapshot em IndexedDB renderizado à parte, como o rascunho original cogitava — decisão revista nesta rodada, ver detalhes abaixo).
- **Fase 13 (Importação de histórico): concluída para TV Time** — item nº 1 do backlog priorizado, entregue no próprio dia em que o TV Time saiu do ar (15/07/2026): importador do export GDPR do TV Time (séries, episódios e filmes assistidos, casados contra a TMDb) + exportação CSV da própria biblioteca. Trakt/Simkl/Serializd/IMDb/Letterboxd ficaram de fora desta rodada — ver detalhes e "fora de escopo" abaixo (pendentes, ver `PROGRESS.md`).
- **Rodada 2026-07-27 do backlog priorizado: 5 itens concluídos** — estatísticas + retrospectiva, rewatch + status "Pausado", listas personalizadas compartilháveis, layout novo do e-mail de notificação e data de estreia/streaming na Grade. Destaque arquitetural: **listas personalizadas introduziu a primeira rota genuinamente pública do produto** (`/l/[username]/[slug]`, fora do grupo `(app)` e liberada no `proxy.ts`, com `sitemap.xml` dinâmico) — até então "público" só significava "visível a outros usuários logados" (`users.isPrivate`). Ver seções próprias abaixo.

## Correção do bug de upload de foto de perfil (2026-08-04)

**Causa raiz:** o limite de tamanho do avatar (`MAX_AVATAR_SIZE_BYTES`, tanto client quanto server-side em `lib/actions/profile.ts`/`components/settings/avatar-upload.tsx`) estava em 5MB, mas a Vercel impõe um teto rígido de **4.5MB no corpo da requisição de toda Serverless Function** (inclusive Server Actions) — limite de infraestrutura, não configurável via `next.config.ts` (`experimental.serverActions.bodySizeLimit`, aqui setado em 15mb, só controla o limite do próprio Next, que fica _depois_ do gate da Vercel). Uma foto de celular entre ~4.5MB e 5MB passava na validação do app (que dizia "máximo 5MB") mas era rejeitada pela Vercel com um 413 antes mesmo da Server Action rodar — erro genérico, não a mensagem amigável esperada.

**Correção:** limite reduzido para 4MB nos dois lugares (client + server), com folga sob o teto de 4.5MB da Vercel para a sobrecarga do multipart; `file_size_limit` do bucket `showradar` no Supabase Storage também alinhado (4194304 bytes) para os três níveis (client/server/bucket) ficarem consistentes.

**Achado relacionado, não corrigido:** o mesmo problema existe em potencial na importação de histórico (`lib/actions/import.ts`, `components/import/import-upload-form.tsx`) — limite de 15MB lá, mas qualquer ZIP/CSV entre 4.5MB e 15MB sofre o mesmo 413 da Vercel antes de chegar no código. Não mexido nesta rodada por estar fora do escopo do bug reportado (foto de perfil); considerar reduzir o teto ou migrar pra upload direto ao Supabase Storage (bypassando o corpo da Server Action) se isso for reportado na prática.

**Como testei:** build de produção local (`next start`) + Playwright contra o Supabase real (conta `qa_persistent`) — upload de uma imagem válida confirmado ponta a ponta (linha gravada em `users.avatar_url`, imagem acessível via URL pública, avatar atualizado na UI); arquivo de ~4.3MB confirmado rejeitado no client (mensagem "no máximo 4MB", nenhum POST disparado à rede). O teto de 4.5MB da própria Vercel não é reproduzível em `next start` local (é um comportamento só da infraestrutura de produção), então essa parte da causa raiz foi confirmada pela documentação oficial da Vercel, não por reprodução direta. Conta de teste e avatar de teste revertidos ao estado limpo ao final. `npx tsc --noEmit` sem erros.

## Investigação e correção de notificações push (2026-07-17 a 2026-07-20)

**Bug de entrega — badge do ícone do app: corrigido.** Auditoria de todo o pipeline (`public/sw.js`, `lib/push.ts`, cron, `lib/comment-notifications.ts`) não achou bug no envio server-side: VAPID configurado corretamente, e o evento `push` do `sw.js` já envolvia `showNotification` em `waitUntil`. A causa real do "badge não aparece no ícone do app" era mais simples: a Badging API (`navigator.setAppBadge`/`clearAppBadge`) nunca tinha sido implementada em lugar nenhum do código. `sw.js` agora chama `self.navigator.setAppBadge()` a cada push recebido, em paralelo ao `showNotification`; o badge some ao clicar na notificação (`notificationclick`) ou ao o app voltar a ficar visível (`register-service-worker.tsx`, ouvindo `visibilitychange`). Adicionado também o campo `badge` (ícone monocromático da barra de status do Android) nas opções da notificação, que estava faltando.

**Bug de entrega — resiliência de assinatura:** o Chrome/Android pode rotacionar o endpoint de uma assinatura de push sozinho (renovação de token FCM), sem nenhuma página aberta para perceber — sem tratar esse caso, o banco continua mandando pro endpoint antigo morto e todo push a partir daí falha silenciosamente, o que bate com "cliquei em Ativar e mesmo assim não chega mais nada". Adicionado handler `pushsubscriptionchange` em `sw.js` + rota `POST /api/push/resubscribe` (Service Worker não fala o protocolo de Server Action do Next, por isso rota comum) que reassina e realinha o endpoint novo em `push_subscriptions`.

**Itens (a)/(b) da investigação original — auditados, não reproduzidos:** envio server-side e handler `push` do Service Worker confirmados corretos (ver acima); não foi possível reproduzir "push não chega" num Android físico nesta sessão (sem aparelho disponível).

**Como testei:** Playwright contra o build de produção e o Supabase real, com perfil de navegador **persistente** (não incógnito — assinatura real de push falha silenciosamente em contexto incógnito, `Registration failed - permission denied`) e a conta `qa_persistent`: assinatura de push real criada (endpoint FCM real, confirmado gravado em `push_subscriptions`), push real entregue ao Service Worker ativo via CDP `ServiceWorker.deliverPushMessage` — notificação exibida com título/corpo/ícone/badge corretos; `self.navigator.setAppBadge()`/`clearAppBadge()` confirmados funcionando sem erro dentro do próprio contexto de execução do Service Worker (anexado via CDP `Target`/`Runtime.evaluate`). Assinatura de teste removida do banco ao final. `npm run lint`, `npx tsc --noEmit` e `npm run build` sem erros.

**Correção de status:** menção/resposta/reação em comentário **já tinham sido implementadas** numa rodada anterior (ver "Comentário e avaliação também em filme/série..." abaixo) — o backlog só listava os três como pendentes por desatualização do documento, não por não estarem prontos.

## Fase 0 — Setup

- [x] Projeto Supabase dedicado (`arrc`, região São Paulo/sa-east-1), schema `showradar`
- [x] Credenciais TMDb (v4 Read Access Token)
- [x] Credenciais OAuth do Google (Google Cloud Console)
- [x] Conta Brevo (e-mail transacional) — criada, remetente `showradar@andreric.com` ("ShowRadar") verificado; **trocado de Resend para Brevo** em relação à ideia original deste documento
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
- [x] "Em breve" só considera datas estritamente futuras (`> hoje`, não `>= hoje`) — um episódio com `air_date` de hoje já é tratado como disponível em todo o resto do app (checklist, "continuar assistindo"), então ficava aparecendo como "ainda não chegou" e "já disponível" ao mesmo tempo. TMDb não expõe horário de lançamento (só a data), então não há como diferenciar "hoje, mas ainda não passou da hora" sem inventar dado
- [x] Página de histórico (`/history`) — agrupada por título, não por episódio: cada série aparece uma vez com barra de progresso + contagem agregada (ex.: 7/13), filmes aparecem uma vez com badge "Filme"; ordenado pela atividade mais recente de cada título (episódios de `user_episode_progress` + filmes concluídos de `user_library.watched_at`)
- [x] Componente `TitleCard` extraído (`components/library/title-card.tsx`) e reaproveitado por Biblioteca, Dashboard e Em Breve, eliminando a duplicação do cartão de pôster
- [x] Seção "Não iniciado" no dashboard — séries com status `plan_to_watch` (adicionadas mas sem nenhum episódio assistido) ganham o mesmo tratamento acionável de "Continuar assistindo" (T1E1, com botão de marcar assistido ali mesmo), em vez de sumirem num pôster genérico; `getNextEpisodesToWatch` foi generalizada para aceitar `watching` ou `plan_to_watch`. Marcar o episódio ali promove a série para `watching` automaticamente, e ela migra para "Continuar assistindo" no recarregamento. "Quero assistir" ficou restrito a filmes
- [x] Todas as datas exibidas ao usuário padronizadas em pt-BR (`lib/format-date.ts::formatDate`)
- [x] "Membro desde {data}" na página pública de perfil (`user/[username]/page.tsx`), usando `users.createdAt`

**Nota:** "pendências" do plano virou a seção "Quero assistir" no dashboard (mesmo rótulo já usado no filtro de status da Biblioteca) em vez de um termo novo — mantém o vocabulário do produto consistente.

## Fase 5 — Notificações (concluída: push e e-mail no cron, quiet hours por fuso horário)

- [x] Chaves VAPID geradas e em `.env.local`/`.env.example`
- [x] Service Worker mínimo (`public/sw.js`) — evento `push` → `showNotification`, `notificationclick` → foca/abre a página do título
- [x] Assinatura de push no navegador — tela `/settings`, botão "Ativar" (`components/settings/push-toggle.tsx`)
- [x] Preferências de notificação — toggles "Novo episódio" e "Nova temporada"
- [x] Job diário (`app/api/cron/check-new-releases/route.ts`, protegido por `Authorization: Bearer $CRON_SECRET`) — `vercel.json` agenda `0 12 * * *` (9h BRT)
- [x] Deduplicação — `dedup_key` único em `notification_log`
- [x] Assinaturas mortas (404/410) removidas automaticamente
- [x] Exclusão de talk shows/jornalismo dos alertas por episódio
- [x] Envio de e-mail pelo cron de notificações (novo episódio/temporada/lançamento de filme), reaproveitando `lib/email.ts` (Brevo)
- [x] Quiet hours / fuso horário por usuário — `/settings` (`components/settings/quiet-hours-form.tsx`), `lib/quiet-hours.ts::isWithinQuietHours`

## Fase 6 — PWA + Polimento Premium (concluída)

- [x] Manifest, ícones, Service Worker (instalável)
- [x] Convite de instalação (iOS + Android/Chromium) — `components/pwa/install-banner.tsx`
- [x] Alternância clara de modo escuro/claro — `ThemeProvider` (`next-themes`)
- [x] Responsividade revisada (mobile) em todas as telas — menu hambúrguer abaixo de `md:`
- [x] Auditoria completa de estados vazios/erro — `src/app/not-found.tsx` e `src/app/error.tsx`
- [x] Atribuição da TMDb — feita, ver Fase 2. Bug corrigido: logo/texto quebrado pra visitante deslogado (mesma causa-raiz do bug do manifest abaixo)

**Bug de infraestrutura encontrado e corrigido nesta rodada:** o matcher do `proxy.ts` só excluía arquivos estáticos por nome exato, então qualquer asset estático não listado nominalmente (manifest do PWA, ícones novos, `tmdb-logo.svg`) ficava bloqueado pelo middleware de autenticação para visitantes deslogados, redirecionando pra `/login`. Trocado por um padrão de exclusão por extensão (`.*\.\w+$`).

## Fase 8 — Social (concluída; Fase 7/Monetização pulada a pedido do usuário)

- [x] Perfis públicos/fechados — `users.is_private`, toggle "Perfil fechado" em `/settings`
- [x] Seguir, estilo Instagram (pedido → aceite) — tabela `follows`, `lib/actions/follow.ts`, `/follow-requests`
- [x] Busca de usuários por username/nome (parcial, com contagem de títulos em comum)
- [x] Busca de usuários por e-mail — comparação exata quando a query contém `@`
- [x] Contagem por aba na busca — `Séries (X) | Filmes (Y) | Atores (Z) | Usuários (A)`
- [x] Feed de atividade dos amigos (`/feed`) — `lib/feed.ts::getFriendActivity`

## Amigos, Área Administrativa e Motor de Descoberta (concluído)

Pedido avulso do usuário, fora da numeração do plano original:

- [x] Lista de amigos (`/friends`) — aceitar um pedido agora também garante a linha recíproca (follow mútuo automático)
- [x] `unfollow` vira "desfazer amizade" quando a relação é mútua
- [x] Área administrativa (`/admin`) — dashboard com métricas, `/admin/users` (busca/filtro/paginação), `/admin/users/[id]` (plano, suspensão)
- [x] `users.role`, `users.plan`, `users.is_suspended` novos no schema
- [x] Motor de descoberta — "Mais assistidos da semana", "Maiores notas da semana" e "Mais populares" na tela de busca
- [x] **Bug encontrado e corrigido:** suspender uma conta só invalidava sessão já ativa, não impedia novo login — corrigido com callback `signIn` em `lib/auth.ts`

### Complemento — Fase 10 (Motor de Recomendação), adicionado depois

- [x] "Recomendados para você" — `getTitleRecommendations` (`lib/tmdb.ts`) chama `/movie|tv/{id}/recommendations` (fallback `/similar`) para os até 6 títulos mais recentemente concluídos, mesclados e ranqueados por `lib/discovery.ts::getRecommendedForYou`
- [x] Vitrine posicionada primeiro, antes das outras três
- [x] Some da tela pra quem ainda não concluiu nada

### Complemento — variação e descarte em "Recomendados para você", adicionado depois

- [x] `getRecommendedForYou` — os 10 exibidos são sorteados (Fisher-Yates) de um pool 3x maior do topo do ranking, não mais os 10 primeiros direto
- [x] Nova tabela `dismissed_recommendations` — botão "X" no card descarta permanentemente

### Complemento — episódios especiais, ordenação da grade e status clicável, adicionado depois

- [x] **Causa raiz do bug de marcar especial como assistido:** `episode.air_date` vem `null` pra boa parte dos especiais — botão ficava `disabled` sempre que `airDate` fosse `null`/futuro. Corrigido tratando "sem data" como "já disponível" (só data futura conhecida ainda bloqueia)
- [x] Temporada 0 (especiais) excluída do total usado pra decidir "Assistido"/celebração
- [x] `/library` sem filtro agrupa por status antes da data
- [x] Status atual nunca aparece mais como botão clicável ao lado dos outros

### Complemento — navegação do admin e contraste no modo claro, adicionado depois

- [x] `/admin` passou a ser a lista de usuários, com abas "Usuários"/"Séries" (`/admin/titles`)
- [x] `/admin/users` (rota antiga) vira redirect pra `/admin` preservando querystring
- [x] `/admin/users/[id]` ganhou `<BackButton />`
- [x] `--muted-foreground` do tema claro escurecida (4,73:1 → 7,80:1 de contraste)

### Complemento — agrupamento de episódios em "Atividade", adicionado depois

- [x] `lib/feed.ts::getFriendActivity` agrupa episódios por `${userId}-${titleId}` — maratona vira uma linha expansível ("+ N episódios anteriores") em vez de dominar o feed
- [x] Busca bruta de episódios passou de `limit` (30) pra `limit * 5` (150) antes de agrupar

### Complemento — identidade visual (logo), landing page e correção da fonte global, adicionado depois

- [x] `components/layout/logo.tsx` — `LogoMark`/`Logo` usados no header, telas de auth e landing
- [x] Landing page (`/`) reconstruída — hero, 6 features, "Como funciona", CTA, rodapé com atribuição TMDb
- [x] `proxy.ts` — usuário logado que visita `/` é redirecionado pro `/dashboard`
- [x] **Bug encontrado e corrigido:** `--font-sans: var(--font-sans)` no `@theme inline` era referência circular inválida em CSS — a Geist carregada via `next/font` nunca era aplicada, app inteiro renderizava na fonte serifada padrão do navegador. Corrigido para `var(--font-geist-sans)`

### Complemento — landing editorial clara, SEO/Google Ads, rotas legais e logo oficial, adicionado depois (rodada do usuário via Gemini CLI)

Rodada executada pelo próprio usuário via Gemini CLI em 2026-07-15 (12 commits).

- [x] Landing `/` redesenhada — estilo "editorial claro", bento grid, "Em 3 passos simples", CTA final, footer
- [x] SEO on-page — `metadataBase`, `title.template`, `openGraph`, `twitter`, JSON-LD `WebSite`
- [x] `src/app/robots.ts` e `src/app/sitemap.ts`
- [x] `src/app/opengraph-image.tsx` — imagem OG 1200×630 gerada por código (`ImageResponse`/next/og)
- [x] Rotas legais `/privacidade` e `/termos` (LGPD)
- [x] Google tag preparada para Ads/GA4 sem conta ainda — `components/analytics/google-tag.tsx`, `lib/gtag.ts::trackEvent`
- [x] Logout passou a redirecionar pra landing (`/`)
- [x] **Logo oficial escolhido ("opção 3")** — 3 anéis com gaps a 135°, vetor de varredura a 225°, play sólido central a 315°, círculo central ciano

**Pendências mapeadas ao documentar (2026-07-15) — todas as 5 resolvidas na sequência, na mesma data:**

1. `/opengraph-image` ficava atrás do login (mesma classe do bug de assets estáticos da Fase 6) — resolvida adicionando `"/opengraph-image"` a `ALWAYS_ACCESSIBLE_PATHS`
2. Conversão de cadastro não instrumentada — resolvida com `signup-conversion.tsx` disparando `trackEvent("sign_up", { method })`
3. `NEXT_PUBLIC_GOOGLE_TAG_ID` fora do `.env.example` — resolvida
4. Iconografia desatualizada — resolvida, re-rasterizada via `sharp` com a geometria da opção 3
5. `SearchAction` do JSON-LD apontava pra `/search`, que exige login — resolvida, removido do JSON-LD

## Fase 9 — Avaliações públicas (concluída)

- [x] Reaproveita `user_library.personal_rating` em vez de tabela nova
- [x] Novas colunas: `review_text`, `review_updated_at`, `review_created_at`
- [x] Escala de 5 estrelas com meia-estrela (`components/title/rating-stars.tsx`)
- [x] Só é possível avaliar um título com status `completed` (checado no servidor)
- [x] Nota e texto sempre públicos, independente de perfil fechado ou de seguir
- [x] Seção "Avaliações" na página de detalhe do título
- [x] `lib/actions/ratings.ts` — `submitRating`/`deleteRating`
- [x] Avaliar pela primeira vez gera evento no feed de atividade
- [x] "Maiores notas da semana" trocou o placeholder (nota TMDb) pela nota média ShowRadar real

## Item 5 do backlog — Avaliações e discussão por episódio (concluído)

Nasceu de uma modal simples de detalhe de episódio e cresceu, a pedido do usuário, para uma página dedicada por episódio com nota e discussão — na direção de Serializd (nota por episódio) + TV Time (discussão pós-episódio).

- [x] Duas rotas novas: `/title/tv/{id}/season/{n}/episode/{m}` e `.../comments`
- [x] Nota separada do comentário — `episode_ratings` é tabela própria (um registro por usuário por episódio)
- [x] Duas tabelas novas pra discussão — `episode_comments` e `episode_comment_likes`
- [x] Avaliar e comentar exigem ter marcado o episódio como assistido
- [x] Comentário aparece na hora ao postar, sem esperar o round-trip do `revalidatePath`
- [x] Resposta com citação (não thread aninhada)
- [x] Menção `@usuário` restrita a amigos (follow mútuo aceito), autocomplete no textarea
- [x] Curtida simples (❤️) por comentário, com contagem e estado otimista
- [x] Borrão de spoiler — só a prévia de 3 comentários, só até 2 dias após a data de exibição

## Comentário e avaliação também em filme/série + like/deslike + notificações (concluído)

Extensão do item 5: o mesmo sistema de comentário do episódio (generalizado, não duplicado) passou a valer pra filme/série.

- [x] Componentes de comentário generalizados (`comment-item.tsx`/`comment-composer.tsx`/`comments-client.tsx`/`comments-preview.tsx`)
- [x] Tabela `title_comments` + rota `/title/[mediaType]/[tmdbId]/comments`
- [x] Nota de filme/série perde o campo de texto livre (`user_library.review_text` removido) — todo texto passa a viver em `title_comments`
- [x] Borrão de spoiler também na página do título
- [x] Like vira like/deslike, episódio e título — enum `comment_reaction_type`, único em `commentId+userId`
- [x] Notificar menção/resposta/reação — `lib/comment-notifications.ts::notifyCommentEvent`, push + e-mail em tempo real
  - **Bug encontrado nesta rodada:** `innerJoin` com `notification_preferences` ignorava silenciosamente quem nunca tinha visitado `/settings`; corrigido pra `leftJoin` com `coalesce(..., true)`. Mesmo problema ainda existe no cron da Fase 5 (não mexido nesta rodada)
- [x] Esqueleto instantâneo em `/library` — `startTransition` + `library-skeleton.tsx`
- [x] Loading nas estrelas — `RatingStars` ganhou prop `disabled`

**Bug de framework encontrado e corrigido:** `useTransition`'s `isPending` ficava travado em `true` para sempre no fluxo de avaliação (bug do par React/Next canary usado no projeto, não da lógica em si). Corrigido trocando por um `useState` (`isSubmitting`) controlado manualmente, com `withTimeout` (8s) como rede de segurança.

## Fase 10 — Recomendação (concluída)

- [x] Método no cliente TMDb (`lib/tmdb.ts::getTitleRecommendations`) — `/movie|tv/{id}/recommendations` com fallback pra `/similar`
- [x] Página de detalhe do título ganhou a seção "Títulos parecidos"
- [x] Seção "Recomendados para você" construída em `/search` (não no `/dashboard`, mudança deliberada a pedido do usuário)
- [x] Sem cache dos resultados de recomendação no banco (busca sob demanda a cada carregamento)

### Complemento — Títulos parecidos na página de detalhe, adicionado depois

- [x] `lib/discovery.ts::getSimilarTitles` — reaproveita `getTitleRecommendations`, escopado a um título fonte, sem excluir títulos já na grade (só marca `inLibrary`)
- [x] Nova seção "Títulos parecidos" ao final da página de detalhe

## Fase 12 — Sincronização offline (concluída)

Duas decisões de arquitetura fechadas com o usuário antes de implementar:

- Visualização offline de `/dashboard`/`/library` via cache HTTP no Service Worker (Cache API), não um snapshot estruturado em IndexedDB
- "Favoritar" saiu do escopo da fila (`user_library.isFavorite` nunca ganhou UI/action)

O que foi construído:

- [x] `idb-keyval` — fila de mutações em IndexedDB (`src/lib/offline/`), namespaced por `userId`
- [x] `toggleEpisodeWatched`, `setSeasonWatched` e `updateLibraryStatus` já eram upserts idempotentes — replay FIFO dá "last-write-wins" de graça
- [x] `runOrQueue()` (`src/lib/offline/run-or-queue.ts`) — tenta a Server Action normalmente, enfileira se offline; usa `unstable_rethrow` pra nunca engolir `redirect()`/`notFound()` real
- [x] Fluxo composto "marcar episódios/temporadas anteriores também?" ficou fora da fila (diálogo não abre offline)
- [x] `OfflineSyncManager` — drena a fila em ordem ao reconectar, `router.refresh()` + toast
- [x] `public/sw.js` ganhou Background Sync como reforço best-effort
- [x] `public/sw.js` — navegação pra `/dashboard`/`/library` vira network-first com fallback de cache; `/_next/static/*` vira cache-first
- [x] `OfflineIndicator` e `SignOutForm` — **risco encontrado e corrigido:** cache de página autenticada podia vazar pro próximo usuário num aparelho compartilhado; corrigido limpando o cache de páginas no cliente antes do sign-out real

## Fase 13 — Importação de histórico do TV Time + exportação CSV (concluída)

O rascunho original cobria só IMDb/Letterboxd, baixíssima prioridade. Em 2026-07-15 — o dia em que o TV Time saiu do ar (26 milhões de instalações órfãs) — a análise competitiva promoveu "importação de histórico" a item nº 1 do backlog e o escopo foi refeito do zero. Trakt/Simkl/Serializd/IMDb/Letterboxd continuam de fora (pendentes, ver `PROGRESS.md`).

- [x] Schema novo: `import_jobs` e `import_job_items` (`import_jobs.source` é enum com um único valor `tv_time` hoje, deixado como enum de propósito pra outras fontes entrarem depois)
- [x] `lib/import/tv-time.ts` — parser puro do ZIP do export GDPR do TV Time via `fflate` (filtro seleciona só os 2 CSVs necessários — nenhum outro arquivo do ZIP é descompactado) e `papaparse`
- [x] `lib/actions/import.ts` — upload síncrono + processamento em lotes pequenos (8 itens por chamada) disparados pelo cliente em loop sequencial, pra não estourar o tempo de execução de uma function da Vercel
- [x] Casamento por `searchTvFuzzy`/`searchMovieFuzzy` — zero candidatos vira `unmatched` sem chute algum
- [x] UI: `/settings/import` (upload + histórico) e `/import/[jobId]` (progresso, resumo, não encontrados)
- [x] Exportação da própria biblioteca em CSV — `GET /api/export/library`

**Fora de escopo (deixado pronto pra depois, não construído):** Trakt, Simkl, Serializd, IMDb e Letterboxd. O formato normalizado de `import_job_items` é agnóstico de fonte.

## Datas de disponibilidade no Brasil (rodada 2026-07-16)

Caso relatado com Silo (Apple TV+): a TMDb registra `air_date` de episódio sob a ótica dos EUA — sem hora/fuso, sem variação regional pra TV. A Apple TV+ solta episódios às ~21h do Pacífico, que já é ~1h de Brasília **do dia seguinte** — o app mostrava o episódio como "disponível" um dia antes de ele existir no Brasil.

- [x] `lib/release-dates.ts` — `hasDelayedBrRelease()` detecta títulos de redes com drop na madrugada seguinte via `watch_providers_br` já cacheado (IDs 350/2243 Apple TV+)
- [x] O deslocamento (+1 dia) acontece na escrita do cache (`tmdb-sync.ts`) — todos os consumidores concordam sem lógica condicional espalhada
- [x] "Hoje" agora é calculado no fuso `America/Sao_Paulo` em todos os 5 pontos que comparavam com o dia UTC

## Item 2 do backlog — Estatísticas + retrospectiva (concluído, 2026-07-27)

`/stats` (horas assistidas, gêneros dominantes por minutos, séries concluídas no ano, séries mais assistidas, dia de maior maratona, seletor de ano) + `/stats/retrospectiva` (cartão único estilo Spotify Wrapped, com reveal animado via confete). Sem gating por época do ano (diferente do Spotify — a base do ShowRadar ainda não tem escala pra gerar o efeito viral de "todo mundo compartilha no mesmo dia") e sem link público (nenhuma rota do app era pública até então): compartilhamento é só por imagem (PNG 1080×1920, gerada via `next/og` em `/api/stats/retrospectiva/image`), baixável ou compartilhável via Web Share API. 100% aditivo em cima do schema existente (`user_episode_progress` + `titles.genres`/`episodes.runtime`), nenhuma migração. Limitação conhecida e aceita: "séries concluídas no ano" usa `user_library.watchedAt`, que só é confiável pra títulos com status `completed` hoje — mudar de status limpa esse campo, então uma série concluída e depois reaberta perde essa data. Isso é sobre a conclusão da série inteira, não sobre rewatch de episódio — não foi coberto pela solução de rewatch do item 3, continua uma limitação separada e aceita. `npm run lint`/`tsc`/`build` limpos; verificado ao vivo contra o Supabase real (conta `qa_persistent`) com dados em dois anos diferentes. **Correção 2026-07-27:** sem app/rota pública, o link do ShowRadar era a única forma de quem recebia o compartilhamento achar o site — mas só estava na imagem (rodapé), não no texto do `navigator.share`, que muita gente (WhatsApp, Instagram) usa como legenda em vez do campo `url`. Imagem passou a usar `www.showradar.com.br` (batendo com a URL oficial) e o texto compartilhado ganhou `https://www.showradar.com.br` embutido.

## Item 3 do backlog — Rewatch + status "Pausado" (concluído, 2026-07-27)

Duas tabelas novas, append-only e sem unique constraint (`episode_watch_events`, `movie_watch_events`) logam cada vista, incluindo rewatches, mantendo `user_episode_progress`/`user_library.watched_at` como estavam (presença + "última vista"). `/stats` (`getAvailableStatsYears`/`getYearStats`) passou a ler dessas tabelas em vez de `user_episode_progress`/`user_library` diretamente, então um rewatch em outro ano soma no ano em que aconteceu, em vez de "roubar" a estatística do ano da primeira vista. `/history` e o feed de amigos não precisaram mudar — já ordenam por `watchedAt`, que o rewatch atualiza igual à primeira vista. Botão "Assistir de novo" novo na página de episódio (quando já assistido) e na página de título pra filme (quando `completed`), chamando `rewatchEpisode`/`rewatchMovie` (`src/lib/actions/episodes.ts`/`library.ts`) — ação distinta do checkbox de assistido/não assistido. Novo status `on_hold` ("Pausado") no enum `library_status`: sticky como "Abandonei" (não é sobrescrito por `syncLibraryStatusFromProgress`), mas ao contrário de "Abandonei" **não** exclui a série do cron de notificação de novo episódio (`ne(status, "dropped")` continua igual) — pausar é "não larguei, só parei por ora", diferente de largar de vez. Importação de histórico (`lib/actions/import.ts`) também loga eventos com a data histórica real do export, não `now()`. Migração com backfill (`0012`/`0013`) preenche as tabelas novas a partir do estado já existente, sem perder histórico de quem já usava o app. `tsc`/`eslint`/`build` limpos; verificado ao vivo (conta `qa_persistent`): rewatch de episódio e de filme confirmados no banco como eventos separados, `/stats` do ano corrente somando as duas vistas de um filme rewatched, série pausada sumindo de "Continuar assistindo" mas continuando em "Em breve", filtro "Pausado" em `/library` funcionando. Estado de teste revertido no banco ao final.

## Item 4 do backlog — Listas personalizadas (concluído, 2026-07-27)

Achado que motivou a arquitetura: já existia uma noção _parcial_ de "público" no schema (`users.isPrivate` + `follows` + `/user/[username]`), mas não pública de verdade — a página faz `redirect("/login")` sem sessão e `/user/*` não está liberada no `proxy.ts`. "Público" ali sempre significou "visível a outros usuários logados", não "indexável pelo Google". Listas precisavam da primeira rota genuinamente pública do produto — decisão nova de arquitetura, não extensão do que já existia.

- [x] Schema novo: `lists` (`id`, `userId`, `slug`, `title`, `description`, `visibility` enum `private`/`unlisted`/`public` — padrão `private`, `isFavorites` boolean) e `list_items` (`id`, `listId`, `titleId`, `addedAt`), índice único `(listId, titleId)`. `visibility` tri-state: `private` (só o dono), `unlisted` (link direto funciona, sem indexação/listagem — `robots: { index: false }` no `generateMetadata`), `public` (indexada no `sitemap.ts`, aparece na página pública).
- [x] Lista "Favoritos" é **automática, não deletável** — uma por usuário, criada sob demanda no primeiro favorito (`getOrCreateFavoritesList`, `src/lib/lists.ts`), garantida via índice único parcial `lists_user_id_favorites_idx` (`WHERE is_favorites = true`). Usuário só controla a visibilidade dela, igual a qualquer lista. Substituiu `user_library.is_favorite`, que nunca teve UI (zero usos fora do próprio schema, confirmado por grep antes de remover) — o botão de coração na página de título agora adiciona/remove da lista Favoritos via `toggleFavorite`.
- [x] Rota pública `/l/[username]/[slug]` (`src/app/l/...`), fora do grupo `(app)` — layout próprio (`src/app/l/layout.tsx`) sem exigir sessão, liberada em `proxy.ts` (`ALWAYS_ACCESSIBLE_PATHS`, prefixo `/l/`). O proxy só libera o _acesso_; a página consulta o banco e decide: dono sempre vê (+ toolbar de visibilidade/exclusão/remoção de item), `public`/`unlisted` qualquer visitante vê, `private` vira `notFound()` pra quem não é dono.
- [x] `generateMetadata` (title/description/OG, `robots: {index:false}` em listas `unlisted`) + `sitemap.ts` deixou de ser array estático — consulta `lists` com `visibility = 'public'`. `export const revalidate = 3600` no sitemap (senão o Next trata a rota como estática, gerada uma vez no build) **mais** `revalidatePath("/sitemap.xml")` disparado por `updateList`/`deleteList` quando a visibilidade muda — uma lista virando pública aparece no sitemap na hora, não em até 1h.
- [x] Gerenciamento em `/(app)/lists` (Favoritos sempre presente + listas custom: criar, renomear/editar descrição inline, mudar visibilidade, excluir) e botão "Listas" + coração de favorito na página de título (`src/components/title/add-to-list-button.tsx`), com criação de lista inline no próprio dropdown. Ações em `src/lib/actions/lists.ts` (padrão de `lib/actions/library.ts`/`follow.ts`).
- [x] Migração única (`0014`) com 3 passos ordenados no mesmo arquivo/transação: criar `lists`/`list_items` → backfill de qualquer `user_library.is_favorite = true` pré-existente pra dentro da lista Favoritos recém-criada → `DROP COLUMN user_library.is_favorite`. Aplicada no Supabase real (projeto `arrc`): 0 favoritos pré-existentes migrados (confirma que a coluna nunca foi escrita, como o grep já indicava).
- **Bug pego na verificação ao vivo:** `DropdownMenuItem` (base-ui) fecha o menu ao clicar por padrão (`closeOnClick` default `true`) — o item "Nova lista" fechava o dropdown inteiro antes do formulário inline de criação conseguir renderizar. Corrigido com `closeOnClick={false}` nesse item específico.
- `tsc`/`eslint`/`build` limpos. Verificado ao vivo via Playwright contra o Supabase real (conta `qa_persistent`): favoritar/desfavoritar um título, criar lista pelo dropdown da página de título, lista aparecendo em `/lists`, alternar visibilidade para pública, acesso anônimo (sessão sem cookie) à página pública retornando 200 com CTA de login, `sitemap.xml` passando a incluir a URL da lista imediatamente após torná-la pública. Estado revertido ao final — só sobra a lista Favoritos vazia (residual esperado de "favoritei uma vez", não sujeira de teste).
- **Limitação aceita, fora de escopo:** sem reordenação manual de itens dentro de uma lista (ordenados por `addedAt`); sem indicador visual de "não listada" na própria página além do `robots` da metadata (o dono vê o aviso no seletor de visibilidade em `/lists`/na página pública, só não há banner extra).

## Item 9 do backlog — Layout do e-mail de notificação (concluído, 2026-07-27)

Reescrito em 2026-07-27. Layout em tabelas com estilos inline (compatibilidade Outlook/Gmail, que ignoram `<style>`): cabeçalho de marca com logo + wordmark (gerado via `next/og` na rota nova `/api/email-logo`, já que a maioria dos clientes de e-mail não renderiza SVG inline), imagem de capa no topo do card (still do episódio buscado via `getTvSeason`, com fallback pro pôster da série quando o still ainda não existe no TMDb; pôster direto pra lançamento de filme), sinopse do episódio logo abaixo (fallback pra sinopse da série/filme quando o episódio ainda não tem `overview`, truncada em 220 caracteres), botão "Ver no ShowRadar" centralizado em cyan-600 (cor de marca da landing), e nome do episódio só é exibido quando é um título real — TMDb devolve "Episódio N" genérico em pt-BR pra episódios sem tradução, filtrado por regex antes de compor o texto (usado tanto no e-mail quanto na notificação push, que reaproveita o mesmo `title`/`body`). Título/corpo/sinopse passam por escape de HTML, já que sinopse é texto livre vindo do TMDb. `passwordResetEmailHtml` reaproveita o mesmo shell visual (`emailShell()`), então o e-mail de redefinição de senha ganhou a identidade nova de graça. Arquivos: `src/lib/email.ts`, `src/app/api/email-logo/route.tsx` (novo), `src/app/api/cron/check-new-releases/route.ts`. Verificado com `tsc --noEmit`/`eslint` limpos, screenshots via Playwright do HTML renderizado (com still real do TMDb, de Silo) e dois e-mails de teste reais enviados em produção pra `arporj@gmail.com` após deploy (um deles com dados reais de X-Men '97 T2E7, cobrindo o caso de episódio sem still/nome/sinopse próprios ainda).

## Item 10 do backlog — Data de estreia + streaming na Grade (concluído, 2026-07-27)

Cards de filme ainda não lançado em `/library` ("Minha Grade") mostravam só pôster + status, sem nenhuma pista de quando estreia nem onde vai passar. Agora mostram "Estreia em dd/mm/aaaa" e, quando o TMDb já tiver cadastrado, os ícones dos serviços de streaming — reaproveitando dados já sincronizados (`titles.releaseDate`, `titles.watchProvidersBr`), sem sync novo. Lógica de dedup/ordenação de provedores extraída de `WatchProviders` (página de detalhe, `src/components/title/watch-providers.tsx`) para `getStreamingProviders()`, reusada em `src/components/library/library-body.tsx`. Limitação esperada, não bug: filme recém-anunciado geralmente ainda não tem streaming cadastrado no TMDb/JustWatch, então só a data aparece até a plataforma confirmar. `tsc`/`eslint` limpos; verificado ao vivo (conta `qa_persistent`) adicionando um filme real ainda não lançado e simulando providers temporariamente no banco pra confirmar o render dos logos, revertido em seguida sem deixar sujeira.

---

## Item 0 do backlog — Notificações push (concluído, 2026-07-29)

Bugs de entrega (badge do ícone do app, resiliência de assinatura FCM) investigados e corrigidos, instrumentados e enviados em 2026-07-23. Teste ao vivo em dispositivo Android físico via um episódio real de Silo em 2026-07-24 — **validado pelo usuário em 2026-07-29**, primeira confirmação de entrega push num aparelho real (até então só verificado via Playwright + CDP, `ServiceWorker.deliverPushMessage`).

Faltavam dois gatilhos sociais, implementados em 2026-07-29: `sendFollowRequest` e `acceptFollowRequest` (`lib/actions/follow.ts`) agora chamam `notifyCommentEvent` (`lib/comment-notifications.ts`) quando, respectivamente, alguém envia um pedido de follow e quando um pedido enviado é aceito — mesmo padrão de dedup via `notification_log`/quiet-hours/push+email já usado por menções, respostas e reações a comentários. O tipo aceito por `notifyCommentEvent` foi ampliado (`follow_request`/`follow_accepted`) em vez de duplicar a lógica de envio num arquivo novo, já que o helper já era genérico o bastante (só faltavam `titleId`/`episodeId` opcionais, que já existiam). Migration `0017_reflective_ulik.sql` adiciona os valores no enum `notification_type` e as colunas `notify_follow_request`/`notify_follow_accepted` (default `true`) em `notification_preferences`; toggles correspondentes em `/settings` seguem o mesmo componente `NotificationPreferencesForm`. `tsc --noEmit` limpo.

## Item 4 do backlog — Compartilhamento de filmes e séries (concluído, 2026-08-21)

Duas metades: link externo com página pública, e recomendação para um amigo dentro do app.

**Página de título pública, mesma URL.** `/title/{movie|tv}/{id}` passou a abrir sem sessão — não existe versão "de convidado" separada, o link que o usuário compartilha é a própria página. Para isso a rota saiu de `app/(app)/` (cujo layout redireciona quem não tem sessão) para `app/(shared)/`, cujo layout escolhe o chrome: `AuthedShell` para quem está logado, `PublicShell` para o visitante. Os dois shells foram extraídos de `(app)/layout.tsx` e de `l/layout.tsx` respectivamente, que agora só os consomem — sem cópia de header em três lugares.

O proxy libera a rota com casamento **exato** (`/^/title/(movie|tv)/d+$/`), não `startsWith`: os comentários e as páginas de episódio moram debaixo do mesmo caminho e continuam exigindo conta. A decisão foi deliberada — menor superfície pública, e a discussão dos usuários não vira conteúdo aberto sem eles terem escolhido isso.

**Ações bloqueadas viram convite, não botão apagado.** Os controles (grade, listas, favoritar, avaliar, marcar temporada/episódio/série) recebem `signedIn` e, quando falso, o clique chama `useSignInRedirect()` (`hooks/use-sign-in-redirect.ts`), que leva para `/login?callbackUrl=<página atual>`. O clique é o momento em que a pessoa demonstra interesse, então ele vira a porta de entrada em vez de um controle desabilitado que não explica nada. Ler continua livre: expandir temporadas e ver a lista de episódios não pede conta. O que é navegação (link de comentários, página de episódio) cai no redirect do próprio proxy, sem código extra.

**`generateMetadata` na página de título** — antes não existia, então todo link compartilhado mostrava o cartão genérico do site. Agora sai nome + ano + sinopse e o backdrop 16:9 do TMDb como `og:image` (o pôster vertical sai cortado no card do WhatsApp). Lê só o cache local via `getCachedTitleId`, sem sincronizar: o Next chama `generateMetadata` e a página em paralelo, e dois `syncTitleFromTmdb` concorrentes dobrariam as chamadas à API.

**Compartilhamento interno** — `lib/actions/share.ts::shareTitleWithFriends`. Não existe caixa de entrada in-app no produto, então "mandar para um amigo" é uma notificação com link, reaproveitando `notifyCommentEvent` (push + e-mail, com dedup, quiet-hours e preferência do destinatário) em vez de um canal novo. Tipo `title_shared` no enum `notification_type` e preferência `notify_title_shared` (migration 0019), com toggle em `/settings`, mesmo padrão do `follow_request` da 0017. A chave de dedup é (destinatário, tipo, remetente, título, dia): recomendar o mesmo título duas vezes no mesmo dia não duplica, recomendar de novo semanas depois volta a notificar.

Os ids de destinatário vêm do cliente, então são revalidados no servidor contra a **mesma** relação que `lib/friends.ts::getFriends` usa — um follow do remetente já aceito pelo destinatário. Uma primeira versão exigia follow nos dois sentidos e teria recusado amizades legítimas de mão única; pego na verificação, antes de ir para o commit.

**Manifest PWA (complemento, 2026-08-21).** Link compartilhado abria no navegador mesmo com o PWA instalado. Não é defeito do compartilhamento: nenhuma API web faz uma página se redirecionar para o próprio app instalado, quem roteia é o SO — e link clicado dentro do navegador embutido de WhatsApp/Instagram nunca chega a ser roteado. O que dava para melhorar era o manifest, que não declarava `scope` nem `launch_handler`: sem o segundo, quando o sistema *de fato* entrega o link ao app com uma janela já aberta, a URL podia ser ignorada em favor do `start_url` (dashboard) em vez de abrir o título compartilhado. `id` foi fixado em `"/dashboard"`, e não em `"/"`: omitido, o `id` já era o `start_url`, então declarar outro valor faria o navegador tratar como um app diferente e orfanar quem já instalou.

**Verificação (Playwright, build de produção):** anônimo recebe 200 na página de título com chrome público, `og:title`/`og:image` corretos e temporadas visíveis; clique em ação leva a `/login?callbackUrl=%2Ftitle%2Ftv%2F87917`; `/comments`, página de episódio e `/dashboard` seguem redirecionando para login. Logado, a mesma URL traz o app inteiro e o menu de compartilhar lista os amigos; o envio grava `notification_log` com `title_shared`. Com a relação de amizade desfeita entre o carregamento da página e o clique, o servidor recusa e não grava nada.

## Decisões técnicas que valem lembrar

- **Nome do app:** ShowRadar.
- **Banco:** Supabase dedicado `arrc` (São Paulo) — migrado de um projeto inicial no Canadá após latência de ~300ms/consulta se mostrar perceptível; hoje ~50-115ms.
- **Autenticação:** Auth.js próprio (Credentials + Google), não Supabase Auth — por isso sessão é via JWT (com `sessionVersion` para revogação), não sessão em banco.
- **Cache de metadados:** `titles`/`seasons` são atualizados a cada visita à página de detalhe (write-through), não só na primeira vez. Desde 2026-07-16, as datas de episódio gravadas são a **disponibilidade no Brasil** (air_date +1 pra redes com drop na madrugada seguinte, ex.: Apple TV+), não o `air_date` cru da TMDb — ver `lib/release-dates.ts`.
- **E-mail transacional:** Brevo, não Resend como cogitado originalmente — conta já criada e remetente verificado antes de qualquer código ser escrito, então a troca não teve custo.
- **Storage de avatar:** Supabase Storage (bucket `showradar`, público, de uso geral — não só avatares) em vez de um serviço novo (Vercel Blob, S3) — reaproveita o mesmo projeto Supabase já usado para o banco, sem depender do deploy na Vercel estar pronto.
- **Ícone do app:** arte oficial da marca (logo "opção 3", escolhido pelo usuário em 2026-07-15) aplicada em todo lugar: `components/layout/logo.tsx`, favicon (`app/icon.svg`), `apple-icon.png`, ícones PWA (`public/icons/*`) e o mark da imagem OG. O placeholder da Fase 6 não existe mais.
- **Menu mobile:** reaproveita o `DropdownMenu` já existente no kit (shadcn/Base UI) em vez de adicionar um componente de "sheet"/drawer novo só pra isso.

## Bugs encontrados e corrigidos

- Botão "Adicionar" reaparecendo como não-adicionado em buscas novas → busca agora consulta a grade do usuário.
- Botão "Adicionar" demorado (2-3s) → resposta otimista instantânea + removida uma busca redundante à TMDb.
- Loop infinito de redirecionamento login ↔ dashboard após a migração de banco (sessão antiga apontando para usuário inexistente) → rota `/api/auth/invalidate` limpa a sessão corretamente.
- E-mail de teste (Brevo) chegando com acentos corrompidos (mojibake) → causa era passar o corpo da requisição com acentos direto como argumento de linha de comando do shell, que não preservava UTF-8; corrigido escrevendo o payload num arquivo UTF-8 e enviando com `curl --data-binary @arquivo`.
- Marcar como assistido o último episódio de uma temporada pelo card "próximo episódio" do dashboard apenas fazia o item sumir da lista, sem nenhuma celebração → corrigido generalizando o `CelebrationOverlay` para disparar por temporada (ver Fase 3).
- Deploy na Vercel sempre falhando com `DATABASE_URL is not set` mesmo após configurar as env vars → import do GitHub tinha sido feito duas vezes, criando dois projetos Vercel separados; as env vars foram parar no projeto errado (ver Fase 0).
- Header quebrado no mobile (overflow horizontal em toda página autenticada) → corrigido com um menu hambúrguer abaixo de `md:` (ver Fase 6).
- Assets estáticos (manifest do PWA, ícones, logo da TMDb) bloqueados pelo middleware de autenticação e redirecionando pra `/login` quando o visitante não estava logado → matcher do `proxy.ts` trocado por exclusão genérica por extensão (ver Fase 6).
- Nenhum `error.tsx`/`not-found.tsx` em lugar nenhum do app → adicionados os dois na raiz (ver Fase 6).
- Suspender uma conta (`users.is_suspended`) bloqueava sessões já ativas no próximo refresh, mas não impedia um **novo** login → corrigido com um callback `signIn` dedicado.
- Marcar um episódio especial (temporada 0) como assistido não fazia nada, sem erro nenhum no console → boa parte dos especiais vem da TMDb com `air_date` nulo, e o botão de assistir ficava `disabled`; corrigido tratando "sem data" como "já disponível".
- Área `/admin`: entrar em "ver usuários" e depois num usuário específico não tinha volta nenhuma → corrigido reestruturando `/admin` e adicionando um `BackButton`.
- App inteiro renderizando na fonte serifada padrão do navegador → `--font-sans: var(--font-sans)` no `@theme inline` do `globals.css` era referência circular inválida; corrigido para `var(--font-geist-sans)`.
