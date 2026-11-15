import { KdtError } from '../errors.js';

/**
 * Numeral systems, named with CLDR numbering-system identifiers:
 * - `latn`: Western digits 0123456789
 * - `arab`: Arabic-Indic digits ٠١٢٣٤٥٦٧٨٩ (U+0660–U+0669), the CLDR default for `ckb`
 * - `arabext`: Extended Arabic-Indic (Persian) digits ۰۱۲۳۴۵۶۷۸۹ (U+06F0–U+06F9)
 */
export type NumeralSystem = 'latn' | 'arab' | 'arabext';

function range(start: number): readonly string[] {
  return Object.freeze(Array.from({ length: 10 }, (_, i) => String.fromCharCode(start + i)));
}

/** Digits 0–9 for each numeral system. */
export const DIGIT_TABLE: Readonly<Record<NumeralSystem, readonly string[]>> = Object.freeze({
  latn: range(0x30),
  arab: range(0x660),
  arabext: range(0x6f0),
});

/** Digits 0–9 for each numeral system, e.g. `DIGITS.arab[4] === '٤'`. */
export const DIGITS = DIGIT_TABLE;

const ANY_DIGIT_RE = /[0-9٠-٩۰-۹]/g;

/** @internal Value (0–9) of a single digit in any supported system, or undefined. */
export function digitValue(ch: string): number | undefined {
  if (ch.length !== 1) return undefined;
  const c = ch.charCodeAt(0);
  if (c >= 0x30 && c <= 0x39) return c - 0x30;
  if (c >= 0x660 && c <= 0x669) return c - 0x660;
  if (c >= 0x6f0 && c <= 0x6f9) return c - 0x6f0;
  return undefined;
}

/** @internal */
export function assertNumeralSystem(value: unknown): asserts value is NumeralSystem {
  if (value !== 'latn' && value !== 'arab' && value !== 'arabext') {
    throw new KdtError('INVALID_OPTION', `Unknown numeral system: ${String(value)}`);
  }
}

/**
 * Converts every digit in `text` (Western, Arabic-Indic or Persian) to the `to` numeral system.
 * Other characters are left unchanged.
 *
 * @example
 * convertDigits('ژمارە: 0750 123 4567', 'arab'); // 'ژمارە: ٠٧٥٠ ١٢٣ ٤٥٦٧'
 * convertDigits('۱۲۳٤', 'latn');                 // '1234'
 */
export function convertDigits(text: string, to: NumeralSystem): string {
  assertNumeralSystem(to);
  const target = DIGIT_TABLE[to];
  return text.replace(ANY_DIGIT_RE, (d) => target[digitValue(d)!]!);
}
