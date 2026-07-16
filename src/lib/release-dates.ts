import type { TmdbWatchProviderRegion } from "@/lib/tmdb";

// O TMDb registra o air_date de episódios de TV sob a ótica dos EUA — data
// seca, sem hora, sem fuso, e sem variação por país (datas regionais existem
// só para filmes). Para serviços cujo drop global acontece num horário que já
// é madrugada do dia seguinte no Brasil, a data efetiva aqui é air_date + 1:
// a Apple TV+ solta episódios às ~21h do Pacífico (~1h em Brasília do dia
// seguinte). Netflix e afins soltam à meia-noite do Pacífico (4h–5h em
// Brasília do mesmo dia) e não precisam de ajuste.
const DELAYED_BR_PROVIDER_IDS = new Set([
  350, // Apple TV+ (listado como "Apple TV" após o rebrand)
  2243, // Apple TV+ via Amazon Channel
]);

// Recebe o jsonb `titles.watch_providers_br` (ou o mesmo objeto vindo direto
// do detail do TMDb) — tipado como unknown porque a coluna não é tipada.
export function hasDelayedBrRelease(providersBr: unknown): boolean {
  const region = providersBr as TmdbWatchProviderRegion | null | undefined;
  return (region?.flatrate ?? []).some((p) => DELAYED_BR_PROVIDER_IDS.has(p.provider_id));
}

export function shiftDateString(date: string, days: number): string {
  if (days === 0) return date;
  const shifted = new Date(`${date}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

// "Hoje" no fuso de Brasília, como YYYY-MM-DD (formato do locale en-CA) — o
// formato date-only das colunas air_date/release_date. Comparar com o dia UTC
// fazia o "hoje" do app virar às 21h no horário de Brasília, antecipando
// estreias em 3 horas.
export function todayBrDateString(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}
