import { SORANI_ALPHABET, isDistinctiveSoraniLetter, isSoraniLetter } from './alphabet.js';
import { AGGRESSIVE_NORMALIZATION, normalize } from './normalize.js';
import { convertDigits } from '../numbers/digits.js';

const ARABIC_SCRIPT_WORD_RE = /[\p{Script=Arabic}‌]+/gu;

/**
 * Share of Arabic-script words in `text` that contain at least one letter used only in Sorani
 * (ە ۆ ێ ڵ ڕ ڤ). The result is between 0 and 1. Text with no Arabic-script words scores 0.
 *
 * This is a heuristic. Very short phrases (one or two words) may not include any of these
 * letters even when they are Sorani. For real language identification, use a dedicated tool
 * such as KurdishLID.
 */
export function soraniScore(text: string): number {
  const words = text.match(ARABIC_SCRIPT_WORD_RE) ?? [];
  const real = words.filter((w) => w.replace(/‌/g, '').length > 0);
  if (real.length === 0) return 0;
  let hits = 0;
  for (const word of real) {
    for (const ch of word) {
      if (isDistinctiveSoraniLetter(ch)) {
        hits++;
        break;
      }
    }
  }
  return hits / real.length;
}

/** Options for {@link isSorani}. */
export interface IsSoraniOptions {
  /** Minimum {@link soraniScore} needed to count the text as Sorani. [0.2] */
  readonly threshold?: number;
}

/**
 * Heuristic check: does `text` look like Sorani written in Arabic script? See {@link soraniScore}.
 *
 * @example
 * isSorani('من کوردم و لە هەولێر دەژیم'); // true
 * isSorani('أنا أعيش في بغداد');           // false (Arabic)
 * isSorani('من در تهران زندگی می‌کنم');     // false (Persian)
 */
export function isSorani(text: string, options: IsSoraniOptions = {}): boolean {
  const threshold = options.threshold ?? 0.2;
  const score = soraniScore(text);
  return score > 0 && score >= threshold;
}

/** Kind of problem found by {@link validateSorani}. */
export type SoraniIssueType =
  | 'arabic-yeh'
  | 'arabic-kaf'
  | 'teh-marbuta'
  | 'heh-zwnj'
  | 'reh-variant'
  | 'tatweel'
  | 'non-sorani-letter';

/** One problem found by {@link validateSorani}. `index` is a UTF-16 offset into the input. */
export interface SoraniIssue {
  readonly type: SoraniIssueType;
  readonly index: number;
  readonly char: string;
  /** Suggested replacement (an empty string means remove it). Undefined when there is no single fix. */
  readonly suggestion: string | undefined;
}

const ISSUE_MAP: Readonly<Record<string, { type: SoraniIssueType; suggestion: string }>> = {
  'ي': { type: 'arabic-yeh', suggestion: 'ی' },
  'ى': { type: 'arabic-yeh', suggestion: 'ی' },
  'ك': { type: 'arabic-kaf', suggestion: 'ک' },
  'ة': { type: 'teh-marbuta', suggestion: 'ە' },
  'ڒ': { type: 'reh-variant', suggestion: 'ڕ' },
  'ـ': { type: 'tatweel', suggestion: '' },
};

/**
 * Finds characters that are probably wrong in Sorani text: Arabic look-alike letters, legacy
 * encodings, and Arabic-script letters that are not in the Sorani alphabet (for example ث ذ ض ط ظ,
 * which appear only in some Arabic loanwords and names). Digits, punctuation, spaces and Latin text
 * are not reported. The input is never changed.
 */
export function validateSorani(text: string): SoraniIssue[] {
  const issues: SoraniIssue[] = [];
  let index = 0;
  const chars = Array.from(text);
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    const known = ISSUE_MAP[ch];
    if (known) {
      issues.push({ type: known.type, index, char: ch, suggestion: known.suggestion });
    } else if (ch === 'ه' && chars[i + 1] === '‌') {
      issues.push({ type: 'heh-zwnj', index, char: ch + '‌', suggestion: 'ە' });
    } else if (/\p{Script=Arabic}/u.test(ch) && /\p{L}/u.test(ch) && !isSoraniLetter(ch)) {
      issues.push({ type: 'non-sorani-letter', index, char: ch, suggestion: undefined });
    }
    index += ch.length;
  }
  return issues;
}

// ---------------------------------------------------------------------------------------------
// Sorting and search
// ---------------------------------------------------------------------------------------------

const WEIGHTS: ReadonlyMap<string, number> = (() => {
  const map = new Map<string, number>();
  SORANI_ALPHABET.forEach((ch, i) => map.set(ch, i + 1));
  map.set('ھ', map.get('ه')!); // h variant sorts with ه
  map.set('آ', map.get('ا')!);
  map.set('أ', map.get('ا')!);
  map.set('إ', map.get('ا')!);
  return map;
})();

/** Options for {@link createSoraniComparator}. */
export interface SoraniCompareOptions {
  /**
   * Apply the default {@link normalize} rules to both strings before comparing, so `ي`/`ی` and
   * `ك`/`ک` sort together. [true]
   */
  readonly normalize?: boolean;
  /** Ignore diacritics and tatweel. [true] */
  readonly ignoreDiacritics?: boolean;
}

function sortKey(s: string, opts: SoraniCompareOptions): string[] {
  let t = s;
  if (opts.normalize !== false) t = normalize(t);
  if (opts.ignoreDiacritics !== false) {
    t = normalize(t, {
      unicodeNfc: false, yeh: false, kaf: false, tehMarbuta: false, hehZwnj: false, h: false,
      rehVariant: false, tatweel: true, diacritics: true,
    });
  }
  return Array.from(t.replace(/‌/g, ''));
}

/**
 * Creates a comparator that sorts strings in Sorani alphabetical order (ر < ڕ, ل < ڵ, ه < ە,
 * و < ۆ, ی < ێ). Characters outside the Sorani alphabet sort after Sorani letters, in code-point
 * order, and digits sort by value whatever their numeral system.
 *
 * @example
 * ['ڕێگا', 'زەوی', 'ئاو', 'رووناک'].sort(createSoraniComparator());
 * // ['ئاو', 'رووناک', 'ڕێگا', 'زەوی']
 */
export function createSoraniComparator(options: SoraniCompareOptions = {}): (a: string, b: string) => number {
  const offset = SORANI_ALPHABET.length + 1;
  const weight = (ch: string): number => {
    const w = WEIGHTS.get(ch);
    if (w !== undefined) return w + 1_000;
    const latin = convertDigits(ch, 'latn');
    if (/^[0-9]$/.test(latin)) return Number(latin); // digits first, by value
    return offset + 1_000 + ch.codePointAt(0)!;
  };
  return (a, b) => {
    const ka = sortKey(a, options);
    const kb = sortKey(b, options);
    const n = Math.min(ka.length, kb.length);
    for (let i = 0; i < n; i++) {
      const diff = weight(ka[i]!) - weight(kb[i]!);
      if (diff !== 0) return diff < 0 ? -1 : 1;
    }
    if (ka.length !== kb.length) return ka.length < kb.length ? -1 : 1;
    // Tie-break on the raw strings so the order is deterministic.
    return a < b ? -1 : a > b ? 1 : 0;
  };
}

const DEFAULT_COMPARATOR = createSoraniComparator();

/** Compares two strings in Sorani alphabetical order (default options). Usable with `Array#sort`. */
export function compareSorani(a: string, b: string): number {
  return DEFAULT_COMPARATOR(a, b);
}

/**
 * Builds a search/index key: every normalization rule is applied, diacritics, tatweel, ZWNJ and bidi
 * controls are removed, digits become Western, Latin letters become lowercase, and runs of whitespace
 * become a single space. Store the key next to the original text. Never show the key to users in
 * place of the original.
 *
 * @example
 * searchKey('كوردستانى  ٢٠٢٦'); // 'کوردستانی 2026'
 */
export function searchKey(text: string): string {
  return convertDigits(normalize(text, AGGRESSIVE_NORMALIZATION), 'latn')
    .replace(/[‌‍]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** True when the two strings have the same {@link searchKey}. */
export function looseEquals(a: string, b: string): boolean {
  return searchKey(a) === searchKey(b);
}

/** True when the {@link searchKey} of `haystack` contains the {@link searchKey} of `needle`. */
export function looseIncludes(haystack: string, needle: string): boolean {
  return searchKey(haystack).includes(searchKey(needle));
}
