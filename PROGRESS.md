# ShowRadar — Status do Projeto

_Atualizado em: 2026-07-09_

Referência do plano completo: `C:\Users\andre\.claude\plans\quero-fazer-um-sistema-magical-kite.md`

## Visão geral

- **Núcleo (Fases 0-4): concluído e testado contra TMDb/banco reais.**
- **Fase 5: push concluído e testado; e-mail (Resend) pendente.**
- **Fase 6: não iniciado.**
- **Expansão (Fases 7-13): não iniciada.**

---

## Fase 0 — Setup

- [x] Projeto Supabase dedicado (`arrc`, região São Paulo/sa-east-1), schema `showradar`
- [x] Credenciais TMDb (v4 Read Access Token)
- [x] Credenciais OAuth do Google (Google Cloud Console)
- [ ] Conta Resend (e-mail) — necessária na Fase 5
- [ ] Conta Stripe em modo teste — necessária na Fase 7
- [ ] Repositório remoto (GitHub) e deploy (Vercel) — projeto só existe localmente até agora

## Fase 1 — Scaffold, Auth e Schema

- [x] Next.js 16 (TypeScript, App Router, Tailwind, shadcn/ui)
- [x] Schema Drizzle completo do núcleo (`users`, `accounts`, `titles`, `seasons`, `episodes`, `user_library`, `user_episode_progress`, `push_subscriptions`, `notification_preferences`, `notification_log`, `password_reset_tokens`)
- [x] Auth.js: login por e-mail/senha (Argon2id) + Google OAuth
- [x] Cadastro com username, nome e avatar (padrão via DiceBear ou foto do Google)
- [x] Onboarding obrigatório de username para quem entra pelo Google
- [x] Sessão via JWT com `sessionVersion` (login por credenciais não permite sessão em banco no Auth.js) — "sair de todos os dispositivos" funcionando
- [x] Proteção de rotas (proxy/middleware) separada em config "edge-safe" (sem banco) + config completa (com banco)
- [x] Rota de recuperação de loop de redirecionamento (`/api/auth/invalidate`) para sessões inválidas/órfãs
- [ ] Recuperação de senha ("esqueci minha senha") — tabela `password_reset_tokens` já existe, fluxo/e-mail ainda não construído (depende da Fase 5)
- [ ] Upload de foto de perfil (hoje só existe o avatar padrão gerado; escolher/enviar uma foto própria ainda não foi implementado)

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
- [ ] Estado de carregamento (esqueleto) na página de busca e na grade — ainda não adicionado
- [ ] Atribuição obrigatória da TMDb (logo + texto legal no rodapé) — **pendente, é exigência dos termos de uso da TMDb, não só estética**
- [x] "Onde assistir" na página de detalhe — logos dos serviços de streaming (assinatura/grátis/com anúncios) disponíveis no Brasil, via `append_to_response=watch/providers` da TMDb (dados da JustWatch), sincronizado junto com o resto do título e cacheado em `titles.watch_providers_br` (migração `0001_curvy_toad_men.sql`); link de atribuição à JustWatch incluído (exigência de uso desses dados, independente da atribuição geral da TMDb acima)

## Fase 3 — Marcação de Assistido

- [x] Buscar episódios de uma temporada (`getTvSeason`), sincronizados sob demanda ao expandir a temporada — não antecipado para todas as temporadas de uma vez (evita dezenas de chamadas à TMDb em séries longas)
- [x] Checklist de episódios assistidos por temporada, com miniatura, data de exibição e resposta otimista instantânea
- [x] "Marcar/desmarcar temporada inteira", afetando só episódios já exibidos (episódios sem data ou com data futura ficam de fora, tanto na contagem quanto na ação em massa) — disponível direto no cabeçalho da temporada, sem precisar expandi-la
- [x] Barra de progresso por temporada e barra agregada da série inteira (episódios assistidos / total) — implementada como consulta agregada (`lib/progress.ts`, `getWatchedEpisodeCounts`), não como uma `VIEW` SQL literal como o plano original cogitava; o total usa `seasons.episode_count` (já cacheado na sincronização do título), então funciona mesmo com temporadas cujos episódios ainda não foram abertos/sincronizados
- [x] Marcação por ícone animado (círculo → check preenchido, com "pop" e anel pulsante) no lugar de checkbox tradicional (`components/title/episode-watch-button.tsx`, reaproveitado tanto por episódio quanto pelo botão de temporada inteira)
- [x] Celebração em tela cheia (confete via `canvas-confetti` + cartão animado) quando o usuário termina o último episódio pendente da série — dispara uma única vez por sessão ao cruzar 100%, não repete ao reabrir uma série já concluída nem ao desmarcar/remarcar o último episódio (`components/title/watch-progress.tsx`, `components/title/celebration-overlay.tsx`)
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

**Nota:** "pendências" do plano virou a seção "Quero assistir" no dashboard (mesmo rótulo já usado no filtro de status da Biblioteca) em vez de um termo novo — mantém o vocabulário do produto consistente.

## Fase 5 — Notificações (push concluído; e-mail pendente — sem conta Resend ainda)

- [x] Chaves VAPID geradas (`npx web-push generate-vapid-keys`) e em `.env.local`/`.env.example` (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_SUBJECT`)
- [x] Service Worker mínimo (`public/sw.js`) — só o necessário para push (evento `push` → `showNotification`, `notificationclick` → foca/abre a página do título); não é o Service Worker completo de PWA/offline da Fase 6, mas convive com ele depois sem conflito
- [x] Assinatura de push no navegador — tela `/settings`, botão "Ativar" (`components/settings/push-toggle.tsx`) registra o Service Worker, pede permissão, chama `pushManager.subscribe` e salva em `push_subscriptions` via `lib/actions/notifications.ts::subscribeToPush`; "Desativar" remove a assinatura no navegador e no banco
- [x] Preferências de notificação — tela `/settings` com toggles "Novo episódio" e "Nova temporada" (`notification_preferences.notify_new_episode`/`notify_new_season`), salvos com resposta otimista; `pushEnabled` é controlado implicitamente por assinar/cancelar (sem um terceiro botão redundante para a mesma coisa)
- [x] Job diário (`app/api/cron/check-new-releases/route.ts`, protegido por `Authorization: Bearer $CRON_SECRET`) — para cada título rastreado por algum usuário (status ≠ abandonei), resincroniza com a TMDb (`syncTitleFromTmdb`) e verifica se `last_episode_to_air`/`release_date` bate com hoje; classifica episódio 1 como "nova temporada", os demais como "novo episódio"; `vercel.json` agenda `0 12 * * *` (9h BRT) — só dispara de fato depois do deploy na Vercel (pendente, ver Fase 0); testável manualmente via `curl` com o bearer secret desde já
- [x] Deduplicação — `dedup_key` único em `notification_log` (`push:<userId>:<titleId>:<tipo>:<temporada-episódio ou data>`), checado antes de enviar e protegido por `onConflictDoNothing` como rede de segurança extra a nível de banco
- [x] Assinaturas mortas (404/410) removidas automaticamente após tentativa de envio falhar (`lib/push.ts` classifica o erro; a rota do cron apaga a linha de `push_subscriptions`)
- [x] Exclusão de talk shows/jornalismo dos alertas por episódio — gêneros TMDb "Talk" (10767) e "News" (10763) pulam notificação de tipo "novo episódio" (nova temporada e lançamento de filme não são afetados)
- [ ] Envio de e-mail via Resend + templates (React Email) — não iniciado, aguardando o usuário criar a conta Resend
- [ ] Quiet hours / fuso horário por usuário — colunas já existem em `notification_preferences`, ainda sem UI nem uso no cron (fora do escopo desta rodada)

**Como testei:** rodei o dev server com as env vars novas (precisou reiniciar — variáveis só carregam na subida do processo), confirmei `GET /api/cron/check-new-releases` retorna 401 sem o bearer e com um bearer errado, e 200 com o correto (rodou contra os 12 títulos reais rastreados pelas contas de teste desta sessão, sem erros). Confirmei os toggles de preferência persistindo de verdade (desligar → recarregar página → continua desligado, lido do banco). **Limitação do ambiente de teste:** o Chromium headless usado para verificação sempre reporta `Notification.permission` como `"denied"`, mesmo concedendo a permissão via Playwright — não deu para simular o clique em "Ativar" ponta a ponta pedindo permissão de verdade; o fluxo de gravação em `push_subscriptions` (mesmo padrão de upsert usado em outras tabelas do app) e o tratamento de erro de envio (`lib/push.ts`, testado com uma subscription inválida — retorna erro estruturado em vez de derrubar a rota) foram verificados separadamente. Também não há como forçar de propósito um "episódio lançado hoje" real sem re-sincronizar de verdade com a TMDb (a rota sempre busca dado fresco antes de comparar), então o caminho completo "detectou lançamento → mandou push → gravou log" só será visto com dado real do dia a dia.

## Fase 6 — PWA + Polimento Premium (não iniciada)

- [ ] Manifest, ícones, Service Worker (instalável)
- [ ] Modal de instalação para iOS (detecção de dispositivo)
- [ ] Alternância clara de modo escuro/claro (variáveis já existem via shadcn, falta o botão)
- [ ] Responsividade revisada (mobile) em todas as telas
- [ ] Auditoria completa de estados vazios/erro
- [ ] Atribuição da TMDb (ver nota na Fase 2 — requisito legal)

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

## Bugs encontrados e corrigidos

- Botão "Adicionar" reaparecendo como não-adicionado em buscas novas → busca agora consulta a grade do usuário.
- Botão "Adicionar" demorado (2-3s) → resposta otimista instantânea + removida uma busca redundante à TMDb.
- Loop infinito de redirecionamento login ↔ dashboard após a migração de banco (sessão antiga apontando para usuário inexistente) → rota `/api/auth/invalidate` limpa a sessão corretamente.
