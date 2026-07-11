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
