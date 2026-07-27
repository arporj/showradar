# ShowRadar — Status do Projeto (Pendências)

_Atualizado em: 2026-07-24 — arquivo reorganizado: todo o histórico do que já foi entregue (Fases 0-13, complementos, decisões técnicas, bugs já corrigidos) foi movido para `PROGRESS_HISTORICO.md`, porque este arquivo estava ficando grande demais. **Volte a checar o histórico sempre que precisar entender como algo pronto foi implementado — não redescubra por leitura de código o que já está documentado lá.** Este arquivo passa a listar só o que falta fazer._

Referência do plano completo: `C:\Users\andre\.claude\plans\quero-fazer-um-sistema-magical-kite.md`
Histórico completo (tudo que já foi construído, fase por fase): `PROGRESS_HISTORICO.md`

## Visão geral

O núcleo do produto (busca, biblioteca, marcação de episódios, dashboard, notificações, PWA, tema, social, avaliações por título e por episódio, comentários, recomendações, admin, importação de histórico do TV Time, sincronização offline, SEO/landing) está **concluído e em produção** — ver `PROGRESS_HISTORICO.md`. O que resta é o backlog priorizado abaixo.

## 🔴 Em andamento agora — notificações push

Bugs de entrega (badge do ícone do app, resiliência de assinatura FCM) foram investigados e corrigidos, instrumentados e enviados em 2026-07-23 — detalhes completos da investigação em `PROGRESS_HISTORICO.md`. Teste ao vivo em dispositivo físico agendado via um episódio real de Silo em 2026-07-24 (hoje) — resultado ainda não confirmado nesta conversa.

Independente do resultado desse teste, ainda faltam:

- [ ] Notificar quando alguém envia um pedido de follow
- [ ] Notificar quando um pedido de follow enviado por você é **aceito**
  (implementar em `lib/actions/follow.ts`, mesmo padrão de `lib/comment-notifications.ts::notifyCommentEvent`, com dedup via `notification_log`)
- [ ] Colunas/toggles novos em `/settings` pros dois gatilhos acima (ex.: `notify_follow_request`, `notify_follow_accepted`) — o restante das preferências granulares já existe
- [ ] Validar entrega em Android físico de verdade — nunca testado num aparelho real até agora, só via Playwright + CDP (`ServiceWorker.deliverPushMessage`)

## Backlog priorizado (análise competitiva — 2026-07-15)

Comparação do ShowRadar contra Trakt, Simkl e Serializd, feita no dia em que o **TV Time foi descontinuado** (15/07/2026 — 26 milhões de instalações órfãs). Rank de importância combinando os gaps identificados na análise com o que já estava especificado e pendente. (O item "Avaliações e discussão por episódio" que estava nesta lista foi concluído em 2026-07-16 — ver `PROGRESS_HISTORICO.md`.)

0. [ ] 🔴 **[PRIORIDADE MÁXIMA]** Notificações push — ver seção "Em andamento agora" acima.
1. [ ] **Importação de histórico — Trakt/Simkl/Serializd/IMDb/Letterboxd pendentes** — TV Time concluído em 2026-07-15 (ver histórico). O formato normalizado de `import_job_items` já é agnóstico de fonte — um parser novo só precisa produzir `{rawTitle, mediaType, yearHint, episodes|movieWatchedAt}` e reaproveitar o casamento+escrita de `processImportBatch` sem alteração. Cada formato exige seu próprio parser.
2. [x] **Estatísticas + retrospectiva** — `/stats` (horas assistidas, gêneros dominantes por minutos, séries concluídas no ano, séries mais assistidas, dia de maior maratona, seletor de ano) + `/stats/retrospectiva` (cartão único estilo Spotify Wrapped, com reveal animado via confete). Sem gating por época do ano (diferente do Spotify — a base do ShowRadar ainda não tem escala pra gerar o efeito viral de "todo mundo compartilha no mesmo dia") e sem link público (nenhuma rota do app é pública hoje): compartilhamento é só por imagem (PNG 1080×1920, gerada via `next/og` em `/api/stats/retrospectiva/image`), baixável ou compartilhável via Web Share API. 100% aditivo em cima do schema existente (`user_episode_progress` + `titles.genres`/`episodes.runtime`), nenhuma migração. Limitação conhecida e aceita: "séries concluídas no ano" usa `user_library.watchedAt`, que só é confiável pra títulos com status `completed` hoje (mudar de status limpa esse campo — ver backlog item 3, rewatch/status). `npm run lint`/`tsc`/`build` limpos; verificado ao vivo contra o Supabase real (conta `qa_persistent`) com dados em dois anos diferentes.
3. [ ] **Rewatch + status "pausado"** — o índice único de `user_episode_progress` (`userId+episodeId`) impede registrar uma segunda vista, e o enum da biblioteca não tem "pausado/on hold". Exige mudança de schema: contagem de plays (ou tabela de eventos de vista) + valor novo no enum.
4. [ ] **Listas personalizadas** — listas criadas pelo usuário, compartilháveis ("Melhores sci-fi de todos os tempos"); presente nos 3 concorrentes, principal gerador de conteúdo social e SEO. Hoje só temos status + favorito (e `isFavorite` nunca ganhou UI).
5. [ ] **Calendário + iCal** — visão de calendário das estreias (`/upcoming` hoje é uma lista) + feed iCal assinável; padrão em Trakt e Simkl.
6. [ ] **Fase 7 — Monetização** — segue especificada e pulada a pedido do usuário; faz mais sentido depois dos itens 1-4 elevarem retenção (stats/retrospectiva e listas são os candidatos naturais a recurso pago, como no Trakt VIP). Especificação completa abaixo.
7. [ ] **Fase 11 — Multi-idioma** — especificada; maior esforço mecânico do backlog e o diferencial atual do app é justamente ser BR-first. Expandir idioma só depois de consolidar o nicho. Especificação completa abaixo.
8. [ ] **Auto-tracking / API pública** — o verdadeiro fosso do Trakt (scrobbling automático via Plex/Kodi) e do Simkl (extensão que detecta o que toca na Netflix/Crunchyroll). Caminho viável: extensão de navegador que marca episódios sozinha. O mais caro de todos — não iniciar antes do resto.
9. [x] **Melhorar o layout do e-mail de notificação** — reescrito em 2026-07-27. Layout em tabelas com estilos inline (compatibilidade Outlook/Gmail, que ignoram `<style>`): cabeçalho de marca com logo + wordmark (gerado via `next/og` na rota nova `/api/email-logo`, já que a maioria dos clientes de e-mail não renderiza SVG inline), imagem de capa no topo do card (still do episódio buscado via `getTvSeason`, com fallback pro pôster da série quando o still ainda não existe no TMDb; pôster direto pra lançamento de filme), sinopse do episódio logo abaixo (fallback pra sinopse da série/filme quando o episódio ainda não tem `overview`, truncada em 220 caracteres), botão "Ver no ShowRadar" centralizado em cyan-600 (cor de marca da landing), e nome do episódio só é exibido quando é um título real — TMDb devolve "Episódio N" genérico em pt-BR pra episódios sem tradução, filtrado por regex antes de compor o texto (usado tanto no e-mail quanto na notificação push, que reaproveita o mesmo `title`/`body`). Título/corpo/sinopse passam por escape de HTML, já que sinopse é texto livre vindo do TMDb. `passwordResetEmailHtml` reaproveita o mesmo shell visual (`emailShell()`), então o e-mail de redefinição de senha ganhou a identidade nova de graça. Arquivos: `src/lib/email.ts`, `src/app/api/email-logo/route.tsx` (novo), `src/app/api/cron/check-new-releases/route.ts`. Verificado com `tsc --noEmit`/`eslint` limpos, screenshots via Playwright do HTML renderizado (com still real do TMDb, de Silo) e dois e-mails de teste reais enviados em produção pra `arporj@gmail.com` após deploy (um deles com dados reais de X-Men '97 T2E7, cobrindo o caso de episódio sem still/nome/sinopse próprios ainda).

---

### Fase 7 — Monetização (especificação; pulada por ora)

- [ ] Campo de plano do usuário — `users.plan` enum (`free`/`premium`), padrão `free`; propagado pro JWT/sessão no mesmo callback `jwt()` que já recarrega `dbUser` a cada refresh (mesmo mecanismo de `sessionVersion`), e nos tipos estendidos de `next-auth.d.ts` (mesmo padrão de `username`/`avatarUrl`)
- [ ] Componente `<AdSlot placement="..." />` com pontos de inserção definidos (dashboard entre seções, entre resultados de busca, dentro da grade) — renderiza vazio quando `session.user.plan === "premium"`; a implementação do anúncio em si (rede/script) fica atrás de uma interface trocável — **nenhuma rede específica integrada nesta especificação**, decisão de negócio pendente
- [ ] Assinatura via Stripe — Checkout Session (assinatura recorrente) criada por Server Action (`lib/actions/billing.ts`), redireciona pro Checkout hospedado da Stripe; webhook `/api/webhooks/stripe` (verificação de assinatura HMAC) atualiza `users.plan` em `checkout.session.completed`/`customer.subscription.deleted`
- [ ] Preço, período de teste grátis e texto de venda ficam como placeholder (`STRIPE_PRICE_ID` via env var) — decisão de negócio a tomar quando a fase for retomada de verdade
- [ ] Conta Stripe em modo teste — pré-requisito de infraestrutura, ainda não criada

### Fase 11 — Multi-idioma (especificação; não iniciada)

- [ ] `next-intl` (padrão de mercado para App Router) — rotas migradas para `app/[locale]/...`, prefixo obrigatório em toda URL (`/pt-BR/dashboard`, `/en-US/dashboard`, `/es/dashboard`); `proxy.ts`/middleware ganha negociação de idioma no primeiro acesso (`Accept-Language`) com redirect pro prefixo correto
- [ ] Extração de toda string hardcoded em pt-BR (praticamente todo componente do app) para catálogos de mensagem (`messages/pt-BR.json`, `en-US.json`, `es.json`) e tradução completa dos três — maior esforço mecânico desta fase, toca a maioria dos arquivos de `components/` e `app/`
- [ ] `lib/format-date.ts` deixa de travar `"pt-BR"` fixo (remove a trava/comentário atual) e passa a receber o locale da rota
- [ ] `lib/tmdb.ts` — `DEFAULT_LANGUAGE` deixa de ser constante fixa e passa a derivar do locale ativo (`pt-BR`→`pt-BR`, `en-US`→`en-US`, `es`→`es-ES`, variante de espanhol a confirmar) — como a TMDb já devolve metadados localizados nativamente por esse parâmetro, boa parte do conteúdo (sinopse, nome) já vem traduzido de graça
- [ ] "Onde assistir" (`watch_providers`) é por **região**, não por idioma — decisão nova necessária aqui: mapear locale→região (`pt-BR`→BR, `en-US`→US, `es`→ES ou MX) e estender `titles.watch_providers_br` (hoje fixo em BR) pra guardar por região; título passa a ser sincronizado uma vez por região visitada, não uma vez só
- [ ] Templates de e-mail (Brevo, `lib/email.ts`) também localizados — notificações e recuperação de senha
- [ ] Seletor de idioma em `/settings` (troca o locale ativo, redireciona pra URL prefixada correspondente)

---

## Pendências avulsas de rodadas anteriores

- **Google Ads/GA4** — conta ainda não existe; a Google tag já está preparada atrás de `NEXT_PUBLIC_GOOGLE_TAG_ID` e o evento `sign_up` já está instrumentado, faltando só criar a conta e configurar o ID (ver memória `project_google_ads_setup_pending`).
- **Conta Stripe em modo teste** — pré-requisito da Fase 7 acima, nunca criada.

_(Fora de escopo por enquanto: wrapper nativo Capacitor + push nativo para lojas de app.)_
