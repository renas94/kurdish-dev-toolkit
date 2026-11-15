/**
 * The Central Kurdish (Sorani) alphabet in conventional dictionary order, using the
 * standard Unicode code points. `ھ` (U+06BE) is listed as an accepted variant of `ه`.
 *
 * Note: the digraph `وو` (long u) is written with two `و` letters and is not a separate code point.
 */
export const SORANI_ALPHABET: readonly string[] = Object.freeze([
  'ئ', 'ا', 'ب', 'پ', 'ت', 'ج', 'چ', 'ح', 'خ', 'د', 'ر', 'ڕ', 'ز', 'ژ', 'س', 'ش', 'ع', 'غ',
  'ف', 'ڤ', 'ق', 'ک', 'گ', 'ل', 'ڵ', 'م', 'ن', 'ه', 'ە', 'و', 'ۆ', 'ی', 'ێ',
]);

/** Letters that appear in Sorani but not in standard Arabic or Persian orthography. */
export const SORANI_DISTINCTIVE_LETTERS: readonly string[] = Object.freeze([
  'ە', 'ۆ', 'ێ', 'ڵ', 'ڕ', 'ڤ',
]);

/** Accepted variants: `ھ` (U+06BE, used by many Kurdish keyboards for h). */
const VARIANT_LETTERS = ['ھ'];

const LETTER_SET = new Set<string>([...SORANI_ALPHABET, ...VARIANT_LETTERS]);
const DISTINCTIVE_SET = new Set<string>(SORANI_DISTINCTIVE_LETTERS);

/** True when `char` is a single standard Sorani letter (including the accepted variant `ھ`). */
export function isSoraniLetter(char: string): boolean {
  return LETTER_SET.has(char);
}

/** @internal */
export function isDistinctiveSoraniLetter(char: string): boolean {
  return DISTINCTIVE_SET.has(char);
}
