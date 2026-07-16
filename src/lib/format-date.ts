// Every user-facing date in the app must render in pt-BR (dd/mm/aaaa), never
// as a raw ISO string. Accepts both Date objects (Drizzle timestamp columns,
// e.g. watchedAt) and ISO date-strings (Drizzle date-only columns, e.g.
// episode.airDate). Date-only strings are parsed as UTC calendar dates —
// `new Date("2026-07-11")` is midnight UTC, and letting the local timezone
// interpret that would show the wrong day west of UTC.
export function formatDate(value: Date | string): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });
  }
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString("pt-BR");
}

// "há 4 horas" / "há 2 dias" style relative time for episode comments — falls
// back to the absolute pt-BR date past a week, so old comments don't render
// as "há 34 dias".
export function formatRelativeTime(value: Date): string {
  const diffMs = Date.now() - value.getTime();
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `há ${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} ${hours === 1 ? "hora" : "horas"}`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days} ${days === 1 ? "dia" : "dias"}`;

  return formatDate(value);
}
