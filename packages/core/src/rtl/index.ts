import { KdtError } from '../errors.js';

/** Text direction. */
export type Direction = 'rtl' | 'ltr';

/** Unicode bidi control characters. */
export const BIDI = Object.freeze({
  LRM: '‎',
  RLM: '‏',
  ALM: '؜',
  LRE: '‪',
  RLE: '‫',
  PDF: '‬',
  LRO: '‭',
  RLO: '‮',
  LRI: '⁦',
  RLI: '⁧',
  FSI: '⁨',
  PDI: '⁩',
});

// Scripts whose letters have bidi class R or AL.
const RTL_LETTER_RE =
  /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}\p{Script=Samaritan}\p{Script=Mandaic}\p{Script=Adlam}\p{Script=Hanifi_Rohingya}\p{Script=Mende_Kikakui}\p{Script=Imperial_Aramaic}\p{Script=Phoenician}\p{Script=Old_South_Arabian}\p{Script=Avestan}\p{Script=Yezidi}]/u;
const LETTER_RE = /\p{L}/u;
const BIDI_CONTROL_RE = /[؜‎‏‪-‮⁦-⁩]/g;

/**
 * True when `char` (one code point) is a strong right-to-left letter (bidi class R or AL),
 * for example a Kurdish, Arabic or Hebrew letter. Digits and punctuation return false.
 */
export function isRtlChar(char: string): boolean {
  return LETTER_RE.test(char) && RTL_LETTER_RE.test(char);
}

/** True when `char` is a strong left-to-right letter (any letter not in an RTL script). */
export function isStrongLtrChar(char: string): boolean {
  return LETTER_RE.test(char) && !RTL_LETTER_RE.test(char);
}

/** Options for {@link getDirection}. */
export interface GetDirectionOptions {
  /**
   * - `'first-strong'`: use the first strong letter. This is the same rule as HTML `dir="auto"` and
   *   Unicode UBA rules P2/P3.
   * - `'majority'`: use whichever kind of letter, RTL or LTR, appears more often. Ties go to `fallback`.
   * ['first-strong']
   */
  readonly strategy?: 'first-strong' | 'majority';
  /** Returned when the text has no strong letters (digits, punctuation or emoji only). ['ltr'] */
  readonly fallback?: Direction;
}

/**
 * Detects the base direction of `text`.
 *
 * @example
 * getDirection('سڵاو، Hello');                          // 'rtl'
 * getDirection('Hello سڵاو');                           // 'ltr'
 * getDirection('iPhone ١٥ نوێترین مۆدێلە', { strategy: 'majority' }); // 'rtl'
 * getDirection('١٢٣', { fallback: 'rtl' });              // 'rtl'
 */
export function getDirection(text: string, options: GetDirectionOptions = {}): Direction {
  const strategy = options.strategy ?? 'first-strong';
  const fallback = options.fallback ?? 'ltr';
  if (strategy !== 'first-strong' && strategy !== 'majority') {
    throw new KdtError('INVALID_OPTION', `Unknown strategy: ${String(strategy)}`);
  }
  let rtl = 0;
  let ltr = 0;
  for (const ch of text) {
    if (!LETTER_RE.test(ch)) continue;
    const isRtl = RTL_LETTER_RE.test(ch);
    if (strategy === 'first-strong') return isRtl ? 'rtl' : 'ltr';
    if (isRtl) rtl++;
    else ltr++;
  }
  if (rtl === ltr) return fallback;
  return rtl > ltr ? 'rtl' : 'ltr';
}

/** Default script for languages KDT knows about. Languages not listed are treated as LTR. */
const RTL_LANGUAGES: ReadonlySet<string> = new Set([
  'ar', 'arc', 'ckb', 'dv', 'fa', 'he', 'iw', 'ks', 'lrc', 'mzn', 'nqo', 'pnb', 'ps', 'sd', 'sdh', 'syr', 'ug', 'ur', 'yi',
]);
const RTL_SCRIPTS: ReadonlySet<string> = new Set([
  'arab', 'hebr', 'syrc', 'thaa', 'nkoo', 'adlm', 'rohg', 'mand', 'samr', 'mend', 'armi', 'phnx', 'sarb', 'avst', 'yezi',
]);

/**
 * True when `locale` (a BCP 47 tag) is written right-to-left. An explicit script subtag wins.
 *
 * @example
 * isRtlLocale('ckb');       // true  (Central Kurdish, Arabic script)
 * isRtlLocale('ckb-IQ');    // true
 * isRtlLocale('ckb-Latn');  // false
 * isRtlLocale('ku');        // false (Kurdish defaults to Latin-script Kurmanji)
 * isRtlLocale('ku-Arab');   // true
 */
export function isRtlLocale(locale: string): boolean {
  if (typeof locale !== 'string' || locale.trim() === '') {
    throw new KdtError('INVALID_OPTION', 'Locale must be a non-empty string');
  }
  const parts = locale.trim().replace(/_/g, '-').toLowerCase().split('-');
  const script = parts.slice(1).find((p) => p.length === 4 && /^[a-z]{4}$/.test(p));
  if (script !== undefined) return RTL_SCRIPTS.has(script);
  return RTL_LANGUAGES.has(parts[0]!);
}

/** `'rtl'` or `'ltr'` for a locale. See {@link isRtlLocale}. */
export function localeDirection(locale: string): Direction {
  return isRtlLocale(locale) ? 'rtl' : 'ltr';
}

/**
 * Wraps `text` in Unicode isolate characters so that it cannot reorder the text around it. Use it
 * when inserting user-provided or mixed-direction text (names, URLs, numbers) into a sentence.
 * With no direction, FSI is used, which picks the direction from the first strong letter.
 *
 * @example
 * `بەکارهێنەر ${isolate('john_doe')} چووە ژوورەوە`
 */
export function isolate(text: string, direction?: Direction): string {
  const open = direction === 'rtl' ? BIDI.RLI : direction === 'ltr' ? BIDI.LRI : BIDI.FSI;
  return open + text + BIDI.PDI;
}

/** Removes all bidi control characters (marks, embeddings, overrides, isolates). ZWNJ and ZWJ are kept. */
export function stripBidiControls(text: string): string {
  return text.replace(BIDI_CONTROL_RE, '');
}

/** A run of text with a single direction, returned by {@link splitByDirection}. */
export interface DirectionRun {
  readonly text: string;
  /** `'neutral'` for runs that contain no strong letters (spaces, digits, punctuation). */
  readonly direction: Direction | 'neutral';
}

/**
 * Splits mixed text into runs of RTL letters, LTR letters and neutral characters. Neutral
 * characters *between* two letters of the same direction are joined into that run, so
 * `'Hello World'` stays a single LTR run.
 *
 * This is meant for styling and wrapping (for example, putting each English phrase in a
 * `<span dir="ltr">`). It is not a full implementation of the Unicode Bidirectional Algorithm.
 */
export function splitByDirection(text: string): DirectionRun[] {
  type Raw = { text: string; direction: Direction | 'neutral' };
  const raw: Raw[] = [];
  for (const ch of text) {
    const dir: Raw['direction'] = isRtlChar(ch) ? 'rtl' : isStrongLtrChar(ch) ? 'ltr' : 'neutral';
    const last = raw[raw.length - 1];
    if (last && last.direction === dir) last.text += ch;
    else raw.push({ text: ch, direction: dir });
  }
  // Merge "X neutral X" into a single X run.
  const merged: Raw[] = [];
  for (let i = 0; i < raw.length; i++) {
    const cur = raw[i]!;
    const prev = merged[merged.length - 1];
    const next = raw[i + 1];
    if (cur.direction === 'neutral' && prev && next && prev.direction === next.direction && prev.direction !== 'neutral') {
      prev.text += cur.text + next.text;
      i++;
    } else if (prev && prev.direction === cur.direction) {
      prev.text += cur.text;
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

/** Options for {@link htmlDirAttributes}. */
export interface HtmlDirOptions {
  /** BCP 47 language tag. When given, the direction comes from it. */
  readonly lang?: string;
  /** Text to detect the direction from when `lang` is not given. */
  readonly text?: string;
}

/** Attributes for an HTML element: `{ dir, lang? }`. */
export interface HtmlDirAttributes {
  readonly dir: Direction | 'auto';
  readonly lang?: string;
}

/**
 * Builds `dir` (and `lang`) attributes for an HTML element. Spread the result into JSX, or
 * serialize it for server templates.
 *
 * @example
 * htmlDirAttributes({ lang: 'ckb' });     // { dir: 'rtl', lang: 'ckb' }
 * htmlDirAttributes({ text: 'Hello' });   // { dir: 'ltr' }
 * htmlDirAttributes({});                  // { dir: 'auto' }
 */
export function htmlDirAttributes(options: HtmlDirOptions): HtmlDirAttributes {
  if (options.lang !== undefined) {
    return { dir: localeDirection(options.lang), lang: options.lang };
  }
  if (options.text !== undefined) {
    return { dir: getDirection(options.text) };
  }
  return { dir: 'auto' };
}

/**
 * Swaps `'left'` and `'right'` for RTL layouts. Use it for physical values (icons, transforms,
 * positioned popovers) that CSS logical properties (`margin-inline-start`, ...) cannot express.
 */
export function mirrorSide(side: 'left' | 'right', direction: Direction): 'left' | 'right' {
  if (direction === 'ltr') return side;
  return side === 'left' ? 'right' : 'left';
}
