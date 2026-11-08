// O callback `jwt` roda a cada leitura de sessão (várias vezes por página).
// Gravar o último acesso em todas elas seria uma escrita no banco por
// requisição; uma vez por hora basta para medir "ativos nos últimos 30 dias".
export const LAST_ACTIVE_WRITE_INTERVAL_MS = 60 * 60 * 1000;

export function shouldRecordLastActive(lastActiveAt: Date | null, now: Date): boolean {
  if (!lastActiveAt) return true;
  return now.getTime() - lastActiveAt.getTime() >= LAST_ACTIVE_WRITE_INTERVAL_MS;
}
