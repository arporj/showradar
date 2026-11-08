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
