import { KdtError } from '../errors.js';
import { assertNumeralSystem, convertDigits, digitValue, type NumeralSystem } from './digits.js';

/** Options for {@link formatNumber}. */
export interface FormatNumberOptions {
  /** Digits to use. ['arab'] */
  readonly numerals?: NumeralSystem;
  /** Decimal separator. ['٫' for arab/arabext, '.' for latn] */
  readonly decimalSeparator?: string;
  /** Thousands separator. Use `''` to turn grouping off. ['٬' for arab/arabext, ',' for latn] */
  readonly groupSeparator?: string;
  /** [0] */
  readonly minimumFractionDigits?: number;
  /** [max(minimumFractionDigits, 3)] */
  readonly maximumFractionDigits?: number;
  /** Minus sign character. ['-'] */
  readonly minusSign?: string;
  /**
   * Bidi mark placed before the minus sign, so it stays on the correct side inside RTL text when
   * Arabic-Indic digits are used. `'alm'` = U+061C ARABIC LETTER MARK, `'rlm'` = U+200F. [false]
   */
  readonly bidiMark?: 'alm' | 'rlm' | false;
}

/** A finite number, a bigint, or a plain decimal string such as `"-1234.5"` (keeps exact precision). */
export type NumericInput = number | bigint | string;

const DECIMAL_STRING_RE = /^-?\d+(\.\d+)?$/;

/** @internal Rounds (half away from zero) to a plain Western decimal string with no grouping, e.g. "-1234.50". */
export function toPlainDecimal(value: NumericInput, minFrac: number, maxFrac: number): string {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new KdtError('INVALID_NUMBER', `Cannot format non-finite number: ${value}`);
  }
  if (typeof value === 'string' && !DECIMAL_STRING_RE.test(value)) {
    throw new KdtError('INVALID_NUMBER', `Not a plain decimal string: "${value}"`);
  }
  if (typeof value !== 'number' && typeof value !== 'bigint' && typeof value !== 'string') {
    throw new KdtError('INVALID_NUMBER', `Unsupported value type: ${typeof value}`);
  }
  if (!Number.isInteger(minFrac) || !Number.isInteger(maxFrac) || minFrac < 0 || maxFrac > 100 || minFrac > maxFrac) {
    throw new KdtError('INVALID_OPTION', `Invalid fraction digits: min=${minFrac}, max=${maxFrac}`);
  }
  const nf = new Intl.NumberFormat('en-US', {
    useGrouping: false,
    minimumFractionDigits: minFrac,
    maximumFractionDigits: maxFrac,
    signDisplay: 'negative',
  });
  // Intl.NumberFormat accepts exact decimal strings (ES2023); the cast satisfies ES2022 typings.
  return nf.format(value as number);
}

/**
 * Formats a number using Kurdish conventions. The output does not depend on the runtime's locale
 * data.
 *
 * @example
 * formatNumber(1234567.891);                           // '١٬٢٣٤٬٥٦٧٫٨٩١'
 * formatNumber(-1500, { numerals: 'latn' });           // '-1,500'
 * formatNumber(0.5, { minimumFractionDigits: 2 });     // '٠٫٥٠'
 */
export function formatNumber(value: NumericInput, options: FormatNumberOptions = {}): string {
  const numerals = options.numerals ?? 'arab';
  assertNumeralSystem(numerals);
  const latin = numerals === 'latn';
  const decimalSeparator = options.decimalSeparator ?? (latin ? '.' : '٫');
  const groupSeparator = options.groupSeparator ?? (latin ? ',' : '٬');
  const minFrac = options.minimumFractionDigits ?? 0;
  const maxFrac = options.maximumFractionDigits ?? Math.max(minFrac, 3);

  const plain = toPlainDecimal(value, minFrac, maxFrac);
  const negative = plain.startsWith('-');
  const unsigned = negative ? plain.slice(1) : plain;
  const [intPart = '0', fracPart] = unsigned.split('.');

  let grouped = intPart;
  if (groupSeparator !== '') {
    grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, groupSeparator);
  }
  let body = fracPart === undefined ? grouped : grouped + decimalSeparator + fracPart;
  body = convertDigits(body, numerals);

  if (!negative) return body;
  const mark = options.bidiMark === 'alm' ? '؜' : options.bidiMark === 'rlm' ? '‏' : '';
  return mark + (options.minusSign ?? '-') + body;
}

/** Options for {@link parseNumber}. */
export interface ParseNumberOptions {
  /**
   * Which ASCII character is the decimal separator; the other one is read as a group separator.
   * `'٫'` (U+066B) is always a decimal separator and `'٬'` (U+066C) always a group separator. ['.']
   */
  readonly decimalSeparator?: '.' | ',';
}

/** Bidi marks, spaces (incl. NBSP / narrow NBSP), apostrophes and underscores are ignored. */
const IGNORED_RE = /[؜‎‏‪-‮⁦-⁩\s  '’_]/g;
const MINUS_RE = /^[-−]/;
const VALID_RE = /^(\d{1,3}(,\d{3})+|\d+)?(\.\d+)?$/;

/**
 * Parses a number written with any mix of Western, Arabic-Indic or Persian digits.
 * Throws `KdtError('PARSE_ERROR')` when the input is not a valid number.
 *
 * @example
 * parseNumber('١٬٢٣٤٫٥');                              // 1234.5
 * parseNumber('۱۲۳٤');                                 // 1234
 * parseNumber('1.234,5', { decimalSeparator: ',' });   // 1234.5
 */
export function parseNumber(input: string, options: ParseNumberOptions = {}): number {
  if (typeof input !== 'string') {
    throw new KdtError('PARSE_ERROR', 'parseNumber() expects a string');
  }
  const decimal = options.decimalSeparator ?? '.';
  if (decimal !== '.' && decimal !== ',') {
    throw new KdtError('INVALID_OPTION', `Invalid decimalSeparator: ${String(decimal)}`);
  }
  const group = decimal === '.' ? ',' : '.';

  let s = input.replace(IGNORED_RE, '');
  let sign = 1;
  if (MINUS_RE.test(s)) {
    sign = -1;
    s = s.slice(1);
  } else if (s.startsWith('+')) {
    s = s.slice(1);
  }

  let normalized = '';
  for (const ch of s) {
    const d = digitValue(ch);
    if (d !== undefined) normalized += String(d);
    else if (ch === '٫' || ch === decimal) normalized += '.';
    else if (ch === '٬' || ch === group) normalized += ',';
    else throw new KdtError('PARSE_ERROR', `Unexpected character "${ch}" in "${input}"`);
  }

  // Group separators are only allowed between digits in the integer part, in groups of three.
  if (normalized === '' || normalized === '.' || !VALID_RE.test(normalized)) {
    throw new KdtError('PARSE_ERROR', `Invalid number: "${input}"`);
  }
  const result = sign * Number(normalized.replace(/,/g, ''));
  return Object.is(result, -0) ? 0 : result;
}
