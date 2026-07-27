# ShowRadar — Status do Projeto (Pendências)

_Atualizado em: 2026-07-27 — arquivo reorganizado: todo o histórico do que já foi entregue (Fases 0-13, complementos, decisões técnicas, bugs já corrigidos) foi movido para `PROGRESS_HISTORICO.md`, porque este arquivo estava ficando grande demais. **Volte a checar o histórico sempre que precisar entender como algo pronto foi implementado — não redescubra por leitura de código o que já está documentado lá.** Este arquivo passa a listar só o que falta fazer._

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
1. [ ] **Importação de histórico — Trakt/Simkl/Serializd/Letterboxd pendentes** — TV Time concluído em 2026-07-15, IMDb concluído em 2026-07-27 (ratings.csv de "Your Ratings"; só filmes e séries inteiras, sem episódio — o export do IMDb não tem granularidade de episódio nem data de assistido separada da data de avaliação; `tvEpisode` é ignorado no parser por não ter como linkar de volta pro show). O formato normalizado de `import_job_items` já é agnóstico de fonte — um parser novo só precisa produzir `{rawTitle, mediaType, yearHint, episodes|movieWatchedAt}` e reaproveitar o casamento+escrita de `processImportBatch` sem alteração (`startImportJob` em `lib/actions/import.ts` já é o wiring compartilhado). Cada formato exige seu próprio parser.
2. [ ] **Calendário + iCal** — visão de calendário das estreias (`/upcoming` hoje é uma lista) + feed iCal assinável; padrão em Trakt e Simkl.
3. [ ] **Fase 7 — Monetização** — segue especificada e pulada a pedido do usuário; faz mais sentido depois de mais itens do backlog elevarem retenção (stats/retrospectiva e listas, já concluídos, são os candidatos naturais a recurso pago, como no Trakt VIP). Especificação completa abaixo.

_(Itens já concluídos deste backlog — estatísticas/retrospectiva, rewatch/status "pausado", listas personalizadas, layout do e-mail, data de estreia+streaming na Grade — foram movidos pra `PROGRESS_HISTORICO.md` em 2026-07-27.)_

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
