@AGENTS.md

# ShowRadar

## Execução local (faixa de portas 3200–3299)

Faixa reservada ao ShowRadar (decisão de 08/11/2026), para não dividir service
worker, cache, localStorage e IndexedDB com outros projetos da pasta
`gemini-cli` (parkmanager usa 3100–3199; arrcsistemas, 3700–3799).

| Porta | Uso |
|---|---|
| 3200 | `npm run dev` e `npm start` (fixa no `package.json`) e painel de prévia (`.claude/launch.json`, `autoPort: false`) |
| 3201 | `next start` de verificação (skill `verify`), para não derrubar o dev server |

- Porta ocupada: o comando falha e não pula para outra. Descobrir quem a ocupa
  (`netstat -ano | findstr :3200`) e avisar.
- `NEXT_PUBLIC_APP_URL` local: `http://localhost:3200`.
- Login com Google em desenvolvimento: o cliente OAuth no Google Cloud Console
  precisa ter `http://localhost:3200/api/auth/callback/google` em "URIs de
  redirecionamento autorizados" (Auth.js monta a URL de retorno pelo endereço
  da requisição).

## Pacote semanal de posts (decisões de 11/11/2026)

- A rotina de domingo (tarefa agendada local "Posts semanais do ShowRadar",
  00:16) roda `npm run gerar-semana` e `npm run renderizar-semana`, sem Chrome,
  para economizar tokens. A rotina antiga na nuvem ficou desativada (não apagada).
- Saída em `marketing/semanas/<segunda>/`, fora do Git: o repositório é público
  e as imagens são dos estúdios.
- Imagens de divulgação nas artes, com 5 regras: só arte oficial (André confere
  na aprovação); crédito "Imagem: divulgação/<streaming ou produtora>"; sem
  montagem; imagens só nos slides de título e na capa (capa sem chamada de
  cadastro), nunca no slide final; se algum post for removido por direito
  autoral, voltar às artes sem imagem.
- Fase 1: André agenda os posts à mão (Instagram com "Compartilhar em"
  Facebook/Threads, e x.com). A API do X não tem mais plano gratuito (cobrança
  por uso desde fev/2026). Fase 2 (pendente): publicação e leitura de
  comentários pelas APIs da Meta, com agendador no Supabase.

## Ajuste de data de lançamento no Brasil (decisão de 13/11/2026)

- O TMDb registra a data da exibição nos EUA. Quando o streaming lança em
  outro dia no Brasil (ex.: Dexter: Ressurreição, sexta no Paramount+ e
  domingo no Showtime), a administração cadastra um ajuste por série em
  Admin → Séries → Data de lançamento, buscando a série pelo nome (tabela `showradar.ajustes_data_lancamento`, de −7 a +7 dias).
- O ajuste manual substitui o +1 automático da Apple TV+
  (`diasDeAjusteBr` em `src/lib/release-dates.ts`) e é aplicado na gravação
  do cache do TMDb, então vale para as datas do site, o "Em breve", os avisos
  e o pacote semanal de posts.
- Se o TMDb passar a registrar a data brasileira, o ajuste precisa ser removido.

## Dependências e `npm audit` (decisão de 13/11/2026)

- `shadcn` fica em `devDependencies`: é a ferramenta de linha de comando que
  gera componentes, e o app só usa o `shadcn/tailwind.css` no build. Em
  `dependencies` ele levava express, hono, undici e o SDK do MCP para o audit
  de produção.
- `next-auth` fica com a versão beta fixa (sem `^`), porque uma beta nova pode
  mudar comportamento. Subir de propósito, lendo as notas da versão.
- Critério de publicação: `npm audit --omit=dev` sem vulnerabilidades críticas
  nem altas. Restam só moderadas e baixas em ferramentas de desenvolvimento
  (CLI do `shadcn` via ts-morph/minimatch, `drizzle-kit` via esbuild antigo,
  `typescript-eslint`), cuja "correção" sugerida pelo npm é rebaixar o
  `shadcn` para 1.0.0 e o `drizzle-kit` para 0.18.1. Não rodar
  `npm audit fix --force`.
