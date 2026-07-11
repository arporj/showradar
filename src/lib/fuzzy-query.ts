/**
 * Generates plausible respellings of a search query to retry against TMDb when
 * the original query returns weak results. TMDb's own search has essentially no
 * typo tolerance (e.g. "stalone" never matches "Stallone"), so this covers the
 * most common class of misspelling for foreign names in Portuguese: a doubled
 * consonant the user forgot to double (or doubled when they shouldn't have).
 */
export function generateSpellingVariants(query: string, limit = 20): string[] {
  const variants = new Set<string>();

  for (let i = 0; i < query.length; i++) {
    const ch = query[i];
    if (!/[a-zA-Z]/.test(ch)) continue;
    variants.add(query.slice(0, i + 1) + ch + query.slice(i + 1));
  }

  for (let i = 0; i < query.length - 1; i++) {
    if (query[i].toLowerCase() === query[i + 1].toLowerCase()) {
      variants.add(query.slice(0, i) + query.slice(i + 1));
    }
  }

  variants.delete(query);
  return [...variants].slice(0, limit);
}
