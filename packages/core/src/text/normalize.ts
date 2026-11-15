import { KdtError } from '../errors.js';
import { DIGIT_TABLE, type NumeralSystem } from '../numbers/digits.js';

/**
 * Options for {@link normalize}. Every rule can be switched on or off. Defaults (shown in
 * brackets) only fix encoding problems that do not change how a Sorani reader understands the
 * text. Rules that are closer to spelling corrections are off by default.
 */
export interface NormalizeOptions {
  /** Apply Unicode NFC to each letter and its marks. [true] */
  readonly unicodeNfc?: boolean;
  /** Arabic `ي` (U+064A) and alef maksura `ى` (U+0649) become Farsi/Kurdish yeh `ی` (U+06CC). [true] */
  readonly yeh?: boolean;
  /** Arabic kaf `ك` (U+0643) becomes keheh `ک` (U+06A9). [true] */
  readonly kaf?: boolean;
  /** Teh marbuta `ة` (U+0629) becomes ae `ە` (U+06D5). [true] */
  readonly tehMarbuta?: boolean;
  /** Legacy `ه` + ZWNJ (U+0647 U+200C) becomes `ە` (U+06D5). [true] */
  readonly hehZwnj?: boolean;
  /**
   * Word-final `ه` (U+0647) becomes `ە`. Off by default because a small number of loanwords end in
   * a real h. [false]
   */
  readonly finalHeh?: boolean;
  /**
   * How the letter h is written. `'heh'` turns `ھ` (U+06BE) into `ه` (U+0647), as Lucene and KLPT do.
   * `'doachashmee'` does the opposite (excluding word-final ه, which is ambiguous). `false` leaves it
   * unchanged. ['heh']
   */
  readonly h?: 'heh' | 'doachashmee' | false;
  /** `ڒ` (U+0692) becomes `ڕ` (U+0695). [true] */
  readonly rehVariant?: boolean;
  /** Word-initial `ر` becomes `ڕ`. In Sorani, a word never begins with a light r. [false] */
  readonly initialReh?: boolean;
  /** Remove tatweel `ـ` (U+0640). [true] */
  readonly tatweel?: boolean;
  /** Remove Arabic harakat and other vowel signs (U+064B–U+065F, U+0670). [false] */
  readonly diacritics?: boolean;
  /** Remove bidi control characters (LRM, RLM, ALM, embeddings, overrides, isolates). [false] */
  readonly bidiControls?: boolean;
  /** Convert every digit to this numeral system. `false` keeps digits unchanged. [false] */
  readonly digits?: NumeralSystem | false;
}

/** Name of a normalization rule, as reported by {@link explainNormalization}. */
export type NormalizationRule =
  | 'unicodeNfc'
  | 'yeh'
  | 'kaf'
  | 'tehMarbuta'
  | 'hehZwnj'
  | 'finalHeh'
  | 'h'
  | 'rehVariant'
  | 'initialReh'
  | 'tatweel'
  | 'diacritics'
  | 'bidiControls'
  | 'digits';

/**
 * One change made by normalization. `index` and `length` are UTF-16 offsets into the original input.
 * When NFC recomposed a letter, a later change to that letter's marks points at the letter's start.
 */
export interface NormalizationChange {
  readonly index: number;
  readonly length: number;
  readonly from: string;
  readonly to: string;
  readonly rule: NormalizationRule;
}

/** Result of {@link explainNormalization}. */
export interface NormalizationReport {
  readonly input: string;
  readonly output: string;
  readonly changes: readonly NormalizationChange[];
}

const DEFAULTS: Required<NormalizeOptions> = {
  unicodeNfc: true,
  yeh: true,
  kaf: true,
  tehMarbuta: true,
  hehZwnj: true,
  finalHeh: false,
  h: 'heh',
  rehVariant: true,
  initialReh: false,
  tatweel: true,
  diacritics: false,
  bidiControls: false,
  digits: false,
};

/** Every rule switched on (h → `'heh'`, digits unchanged). Used to build search keys. */
export const AGGRESSIVE_NORMALIZATION: Required<NormalizeOptions> = {
  unicodeNfc: true,
  yeh: true,
  kaf: true,
  tehMarbuta: true,
  hehZwnj: true,
  finalHeh: true,
  h: 'heh',
  rehVariant: true,
  initialReh: true,
  tatweel: true,
  diacritics: true,
  bidiControls: true,
  digits: false,
};

const ZWNJ = '‌';
const MARK_RE = /\p{M}/u;
const WORD_RE = /[\p{L}\p{M}‌‍]/u;
const DIACRITIC_RE = /[ً-ٰٟ]/u;
const BIDI_CONTROL_RE = /[؜‎‏‪-‮⁦-⁩]/u;

const DIGIT_LOOKUP: ReadonlyMap<string, number> = (() => {
  const map = new Map<string, number>();
  for (const digits of Object.values(DIGIT_TABLE)) {
    digits.forEach((d, i) => map.set(d, i));
  }
  return map;
})();

function resolveOptions(options: NormalizeOptions | undefined): Required<NormalizeOptions> {
  const merged = { ...DEFAULTS, ...options } as Required<NormalizeOptions>;
  if (merged.h !== false && merged.h !== 'heh' && merged.h !== 'doachashmee') {
    throw new KdtError('INVALID_OPTION', `Invalid "h" option: ${String(merged.h)}`);
  }
  if (merged.digits !== false && !(merged.digits in DIGIT_TABLE)) {
    throw new KdtError('INVALID_OPTION', `Unknown numeral system: ${String(merged.digits)}`);
  }
  return merged;
}

interface Cluster {
  readonly index: number;
  readonly text: string;
}

/** Splits text into clusters of one base code point followed by any combining marks. */
function clusters(input: string): Cluster[] {
  const out: Cluster[] = [];
  let i = 0;
  while (i < input.length) {
    const start = i;
    const first = input.codePointAt(i)!;
    i += first > 0xffff ? 2 : 1;
    while (i < input.length) {
      const cp = input.codePointAt(i)!;
      const ch = String.fromCodePoint(cp);
      if (!MARK_RE.test(ch)) break;
      i += ch.length;
    }
    out.push({ index: start, text: input.slice(start, i) });
  }
  return out;
}

function isWordChar(ch: string | undefined): boolean {
  return ch !== undefined && WORD_RE.test(ch);
}

/**
 * Normalizes Sorani text, but only when you call it. KDT never normalizes text on its own.
 *
 * @example
 * normalize('كوردي');                       // 'کوردی'
 * normalize('مه‌لا');                       // 'مەلا'   (ه + ZWNJ → ە)
 * normalize('رۆژ', { initialReh: true });   // 'ڕۆژ'
 */
export function normalize(input: string, options?: NormalizeOptions): string {
  return explainNormalization(input, options).output;
}

/**
 * Same as {@link normalize}, but also returns a list of every change it made, so applications can
 * show or log what was altered.
 */
export function explainNormalization(input: string, options?: NormalizeOptions): NormalizationReport {
  if (typeof input !== 'string') {
    throw new KdtError('INVALID_OPTION', 'normalize() expects a string');
  }
  const opts = resolveOptions(options);
  const changes: NormalizationChange[] = [];
  let output = '';

  const parts = clusters(input);
  for (let p = 0; p < parts.length; p++) {
    const part = parts[p]!;
    let text = part.text;
    const record = (rule: NormalizationRule, from: string, to: string): void => {
      changes.push({ index: part.index, length: part.text.length, from, to, rule });
    };

    let nfcChanged = false;
    if (opts.unicodeNfc) {
      const nfc = text.normalize('NFC');
      if (nfc !== text) {
        record('unicodeNfc', text, nfc);
        text = nfc;
        nfcChanged = true;
      }
    }

    const base = String.fromCodePoint(text.codePointAt(0)!);
    const marks = text.slice(base.length);
    const prev = parts[p - 1]?.text;
    const next = parts[p + 1]?.text;
    const prevChar = prev === undefined ? undefined : String.fromCodePoint(prev.codePointAt(0)!);
    const nextChar = next === undefined ? undefined : String.fromCodePoint(next.codePointAt(0)!);

    // Characters that are removed entirely.
    if (opts.tatweel && base === 'ـ') {
      record('tatweel', part.text, '');
      continue;
    }
    if (opts.bidiControls && BIDI_CONTROL_RE.test(base)) {
      record('bidiControls', part.text, '');
      continue;
    }

    let newBase = base;
    let rule: NormalizationRule | undefined;

    if (opts.yeh && (base === 'ي' || base === 'ى')) {
      newBase = 'ی';
      rule = 'yeh';
    } else if (opts.kaf && base === 'ك') {
      newBase = 'ک';
      rule = 'kaf';
    } else if (opts.tehMarbuta && base === 'ة') {
      newBase = 'ە';
      rule = 'tehMarbuta';
    } else if (opts.hehZwnj && base === 'ه' && next === ZWNJ) {
      // Consume the ZWNJ: the pair is the legacy spelling of ە.
      changes.push({ index: part.index, length: part.text.length + 1, from: part.text + ZWNJ, to: 'ە' + marks, rule: 'hehZwnj' });
      output += 'ە' + applyMarks(marks, opts, part, changes, nfcChanged ? 0 : base.length);
      p++;
      continue;
    } else if (opts.finalHeh && base === 'ه' && isWordChar(prevChar) && !isWordChar(nextChar)) {
      newBase = 'ە';
      rule = 'finalHeh';
    } else if (opts.h === 'heh' && base === 'ھ') {
      newBase = 'ه';
      rule = 'h';
    } else if (opts.h === 'doachashmee' && base === 'ه' && nextChar !== ZWNJ && isWordChar(nextChar)) {
      newBase = 'ھ';
      rule = 'h';
    } else if (opts.rehVariant && base === 'ڒ') {
      newBase = 'ڕ';
      rule = 'rehVariant';
    } else if (opts.initialReh && base === 'ر' && !isWordChar(prevChar)) {
      newBase = 'ڕ';
      rule = 'initialReh';
    } else if (opts.digits !== false) {
      const value = DIGIT_LOOKUP.get(base);
      const target = value === undefined ? undefined : DIGIT_TABLE[opts.digits][value];
      if (target !== undefined && target !== base) {
        newBase = target;
        rule = 'digits';
      }
    }

    if (rule !== undefined) {
      changes.push({ index: part.index, length: base.length, from: base, to: newBase, rule });
    }
    output += newBase + applyMarks(marks, opts, part, changes, nfcChanged ? 0 : base.length);
  }

  return { input, output, changes };
}

function applyMarks(
  marks: string,
  opts: Required<NormalizeOptions>,
  part: Cluster,
  changes: NormalizationChange[],
  offset: number,
): string {
  if (!opts.diacritics || marks === '') return marks;
  let kept = '';
  let pos = part.index + offset;
  for (const mark of marks) {
    if (DIACRITIC_RE.test(mark)) {
      changes.push({ index: pos, length: mark.length, from: mark, to: '', rule: 'diacritics' });
    } else {
      kept += mark;
    }
    pos += mark.length;
  }
  return kept;
}

/** Removes Arabic harakat and vowel signs. Shortcut for `normalize(text, { only diacritics })`. */
export function removeDiacritics(input: string): string {
  return normalize(input, {
    unicodeNfc: false, yeh: false, kaf: false, tehMarbuta: false, hehZwnj: false, finalHeh: false,
    h: false, rehVariant: false, initialReh: false, tatweel: false, diacritics: true, bidiControls: false,
    digits: false,
  });
}
