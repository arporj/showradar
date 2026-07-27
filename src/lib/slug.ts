const SLUG_MAX_LENGTH = 60;
const COMBINING_DIACRITICS_RANGE_START = 0x0300;
const COMBINING_DIACRITICS_RANGE_END = 0x036f;

function stripDiacritics(value: string): string {
  return Array.from(value.normalize("NFD"))
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code < COMBINING_DIACRITICS_RANGE_START || code > COMBINING_DIACRITICS_RANGE_END;
    })
    .join("");
}

export function slugify(input: string): string {
  const base = stripDiacritics(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, "");
  return base || "lista";
}
