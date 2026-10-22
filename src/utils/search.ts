/**
 * Normalizes Arabic (and Latin) text for forgiving, diacritic-insensitive search:
 * - strips tashkeel (diacritics) and tatweel
 * - folds alef variants (أ إ آ) to bare alef
 * - folds ة → ه and ى → ي, which people type interchangeably
 * - lowercases Latin characters
 */
export function normalizeArabic(input: string): string {
  return input
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '') // diacritics + tatweel
    .replace(/[إأآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .trim()
    .toLowerCase()
}

export function textMatches(haystack: string, query: string): boolean {
  if (!query.trim()) return true
  return normalizeArabic(haystack).includes(normalizeArabic(query))
}
