import { KdtError } from '../errors.js';
import { formatNumber, type FormatNumberOptions, type NumericInput } from '../numbers/format.js';

/** Display settings for one currency. KDT stores formatting data only. It has no exchange rates. */
export interface CurrencyDefinition {
  /** ISO 4217 code. */
  readonly code: string;
  /** Short symbol for Sorani text. */
  readonly symbol: string;
  /** Sorani name. Sorani nouns stay singular after a number, so one form is enough. */
  readonly name: string;
  /** Fraction digits that are shown by default. */
  readonly fractionDigits: number;
  /** Where the symbol or name goes relative to the number in Sorani text. */
  readonly position: 'before' | 'after';
}

/**
 * Built-in currencies most often used in the Kurdistan Region.
 *
 * IQD: ISO 4217 lists 3 minor digits, but fils are no longer in circulation, so prices are shown
 * with 0 fraction digits by default.
 */
export const CURRENCIES: Readonly<Record<string, CurrencyDefinition>> = Object.freeze({
  IQD: { code: 'IQD', symbol: 'د.ع', name: 'دینار', fractionDigits: 0, position: 'after' },
  USD: { code: 'USD', symbol: '$', name: 'دۆلار', fractionDigits: 2, position: 'after' },
  EUR: { code: 'EUR', symbol: '€', name: 'یۆرۆ', fractionDigits: 2, position: 'after' },
  TRY: { code: 'TRY', symbol: '₺', name: 'لیرەی تورکی', fractionDigits: 2, position: 'after' },
  IRR: { code: 'IRR', symbol: 'ڕیاڵ', name: 'ڕیاڵی ئێرانی', fractionDigits: 0, position: 'after' },
});

/** Options for {@link formatCurrency}. */
export interface FormatCurrencyOptions extends Omit<FormatNumberOptions, 'minimumFractionDigits' | 'maximumFractionDigits'> {
  /** ISO code of a built-in currency, or a full custom definition. ['IQD'] */
  readonly currency?: string | CurrencyDefinition;
  /** `'symbol'` (د.ع), `'name'` (دینار), `'code'` (IQD) or `'none'`. ['symbol'] */
  readonly display?: 'symbol' | 'name' | 'code' | 'none';
  /** Overrides the currency's default number of fraction digits. */
  readonly fractionDigits?: number;
  /** Overrides the currency's default position. */
  readonly position?: 'before' | 'after';
  /** Text between the number and the symbol. [' ' (U+00A0 no-break space)] */
  readonly separator?: string;
}

/** Looks up a built-in currency by ISO code (case-insensitive). Throws `UNKNOWN_CURRENCY`. */
export function getCurrency(code: string): CurrencyDefinition {
  const def = CURRENCIES[String(code).toUpperCase()];
  if (!def) {
    throw new KdtError(
      'UNKNOWN_CURRENCY',
      `Unknown currency "${code}". Pass a CurrencyDefinition object for currencies that are not built in.`,
    );
  }
  return def;
}

/**
 * Formats a price for display. It formats only: it never converts between currencies.
 * For exact amounts, pass a decimal string (`'1999.99'`) or a bigint instead of a float.
 *
 * @example
 * formatCurrency(1250000);                                    // '١٬٢٥٠٬٠٠٠ د.ع'
 * formatCurrency(1250000, { display: 'name' });               // '١٬٢٥٠٬٠٠٠ دینار'
 * formatCurrency(19.9, { currency: 'USD', numerals: 'latn' }); // '19.90 $'
 * formatCurrency(19.9, { currency: 'USD', numerals: 'latn', position: 'before', separator: '' }); // '$19.90'
 */
export function formatCurrency(amount: NumericInput, options: FormatCurrencyOptions = {}): string {
  const def = typeof options.currency === 'object' && options.currency !== null
    ? options.currency
    : getCurrency(options.currency ?? 'IQD');
  const digits = options.fractionDigits ?? def.fractionDigits;
  const { currency: _c, display: _d, fractionDigits: _f, position: _p, separator: _s, ...numberOptions } = options;
  const number = formatNumber(amount, {
    ...numberOptions,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  const display = options.display ?? 'symbol';
  const label =
    display === 'symbol' ? def.symbol
    : display === 'name' ? def.name
    : display === 'code' ? def.code
    : display === 'none' ? ''
    : (() => { throw new KdtError('INVALID_OPTION', `Invalid display: ${String(display)}`); })();
  if (label === '') return number;
  const separator = options.separator ?? ' ';
  const position = options.position ?? def.position;
  return position === 'before' ? label + separator + number : number + separator + label;
}
