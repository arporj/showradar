import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Strips combining diacritical marks (U+0300-U+036F) left behind by NFD
// normalization, so e.g. "ação" and "acao" compare equal. Written as a
// codepoint filter rather than a \u-escaped regex literal to sidestep editor
// tooling that eagerly decodes \u escapes inside string literals.
export function normalizeSearchText(value: string) {
  return Array.from(value.normalize("NFD"))
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0
      return code < 0x300 || code > 0x36f
    })
    .join("")
    .toLowerCase()
}
