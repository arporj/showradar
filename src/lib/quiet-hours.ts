// Common Brazilian timezones — this app is pt-BR only, so a short curated
// list covering the country's 4 UTC offsets is enough (no need for a full
// global IANA picker).
export const TIMEZONE_OPTIONS = [
  { value: "America/Noronha", label: "Fernando de Noronha (UTC-2)" },
  { value: "America/Sao_Paulo", label: "Brasília, São Paulo, Rio de Janeiro (UTC-3)" },
  { value: "America/Manaus", label: "Manaus, Cuiabá (UTC-4)" },
  { value: "America/Rio_Branco", label: "Acre (UTC-5)" },
] as const;

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesSinceMidnight(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const hours = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minutes = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hours * 60 + minutes;
}

// Both start and end must be set to enforce a window — a user with neither
// configured (the default) is never considered "in quiet hours". Handles a
// window that wraps past midnight (e.g. 22:00 -> 07:00).
export function isWithinQuietHours(
  now: Date,
  timezone: string,
  start: string | null,
  end: string | null,
): boolean {
  if (!start || !end) return false;

  const nowMinutes = minutesSinceMidnight(now, timezone);
  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);
  if (startMinutes === endMinutes) return false;

  if (startMinutes < endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}
