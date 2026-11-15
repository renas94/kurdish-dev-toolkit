import { describe, expect, it } from 'vitest';
import {
  CURRENCIES,
  convertDigits,
  DIGITS,
  formatCurrency,
  formatDate,
  formatNumber,
  formatTime,
  getCurrency,
  getDateParts,
  KdtError,
  parseNumber,
  SORANI_MONTHS,
  SORANI_WEEKDAYS,
} from '../src/index.js';

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    return e instanceof KdtError ? e.code : 'NOT_KDT_ERROR';
  }
  return undefined;
}

describe('digits', () => {
  it('tables', () => {
    expect(DIGITS.arab.join('')).toBe('٠١٢٣٤٥٦٧٨٩');
    expect(DIGITS.arabext.join('')).toBe('۰۱۲۳۴۵۶۷۸۹');
    expect(DIGITS.latn.join('')).toBe('0123456789');
  });
  it('convertDigits converts all systems and leaves other text', () => {
    expect(convertDigits('ژمارە: 0750 123 4567', 'arab')).toBe('ژمارە: ٠٧٥٠ ١٢٣ ٤٥٦٧');
    expect(convertDigits('۱۲۳٤٥', 'latn')).toBe('12345');
    expect(convertDigits('١٢٣', 'arabext')).toBe('۱۲۳');
    expect(convertDigits('', 'arab')).toBe('');
    expect(codeOf(() => convertDigits('1', 'xx' as never))).toBe('INVALID_OPTION');
  });
});

describe('formatNumber', () => {
  it('supports bigint', () => {
    expect(formatNumber(12345678901234567890n)).toBe('١٢٬٣٤٥٬٦٧٨٬٩٠١٬٢٣٤٬٥٦٧٬٨٩٠');
    expect(formatNumber(-5n, { numerals: 'latn' })).toBe('-5');
  });
  it('custom minus sign and rlm mark', () => {
    expect(formatNumber(-1, { minusSign: '−', bidiMark: 'rlm' })).toBe('‏−١');
  });
  it('round-trips through parseNumber', () => {
    for (const n of [0, 1, -1, 12.5, 1234567.125, -0.75]) {
      for (const numerals of ['latn', 'arab', 'arabext'] as const) {
        expect(parseNumber(formatNumber(n, { numerals }))).toBe(n);
      }
    }
  });
  it('validates input', () => {
    expect(codeOf(() => formatNumber(Number.NaN))).toBe('INVALID_NUMBER');
    expect(codeOf(() => formatNumber(Infinity))).toBe('INVALID_NUMBER');
    expect(codeOf(() => formatNumber('1e5'))).toBe('INVALID_NUMBER');
    expect(codeOf(() => formatNumber({} as never))).toBe('INVALID_NUMBER');
    expect(codeOf(() => formatNumber(1, { minimumFractionDigits: 3, maximumFractionDigits: 1 }))).toBe('INVALID_OPTION');
    expect(codeOf(() => formatNumber(1, { numerals: 'roman' as never }))).toBe('INVALID_OPTION');
  });
});

describe('parseNumber', () => {
  it('validates input and options', () => {
    expect(codeOf(() => parseNumber(5 as never))).toBe('PARSE_ERROR');
    expect(codeOf(() => parseNumber('1', { decimalSeparator: ';' as never }))).toBe('INVALID_OPTION');
  });
  it('error messages include the input', () => {
    expect(() => parseNumber('١٢x')).toThrowError(/١٢x/);
  });
});

describe('dates', () => {
  it('month and weekday tables', () => {
    expect(SORANI_MONTHS).toHaveLength(12);
    expect(SORANI_WEEKDAYS).toHaveLength(7);
    expect(SORANI_MONTHS[0]).toBe('کانوونی دووەم');
    expect(SORANI_WEEKDAYS[5]).toBe('هەینی');
  });
  it('getDateParts reads the requested time zone', () => {
    const d = new Date('2026-12-31T22:30:00Z');
    expect(getDateParts(d, { timeZone: 'UTC' })).toEqual({ year: 2026, month: 12, day: 31, weekday: 4, hour: 22, minute: 30, second: 0 });
    expect(getDateParts(d, { timeZone: 'Asia/Baghdad' })).toEqual({ year: 2027, month: 1, day: 1, weekday: 5, hour: 1, minute: 30, second: 0 });
  });
  it('accepts Date, timestamp and ISO string', () => {
    const iso = '2026-03-21T09:05:07Z';
    const expected = formatDate(iso, { timeZone: 'UTC' });
    expect(formatDate(new Date(iso), { timeZone: 'UTC' })).toBe(expected);
    expect(formatDate(Date.parse(iso), { timeZone: 'UTC' })).toBe(expected);
  });
  it('formatTime', () => {
    const d = '2026-03-21T15:05:09Z';
    expect(formatTime(d, { timeZone: 'UTC' })).toBe('١٥:٠٥');
    expect(formatTime(d, { timeZone: 'UTC', hour12: true })).toBe('٣:٠٥ د.ن');
    expect(formatTime(d, { timeZone: 'UTC', seconds: true, numerals: 'latn' })).toBe('15:05:09');
    expect(formatTime(d, { timeZone: 'Asia/Baghdad', numerals: 'latn' })).toBe('18:05');
  });
  it('supports single-letter tokens', () => {
    expect(formatDate('2026-03-05T04:03:02Z', { timeZone: 'UTC', format: 'd/M/yy H:m:s', numerals: 'latn' })).toBe('5/3/26 4:3:2');
  });
  it('uses astronomical year numbering for BC dates', () => {
    const d = new Date(Date.UTC(2000, 0, 1));
    d.setUTCFullYear(-44);
    expect(getDateParts(d, { timeZone: 'UTC' }).year).toBe(-44);
    expect(formatDate(d, { timeZone: 'UTC', format: 'yyyy', numerals: 'latn' })).toBe('-0044');
  });
  it('handles midnight as hour 0', () => {
    expect(formatTime('2026-03-21T00:00:00Z', { timeZone: 'UTC', numerals: 'latn' })).toBe('00:00');
  });
  it('never converts calendars silently', () => {
    expect(codeOf(() => formatDate(new Date(), { calendar: 'persian' as never }))).toBe('UNSUPPORTED_CALENDAR');
    expect(codeOf(() => getDateParts(new Date(), { calendar: 'islamic' as never }))).toBe('UNSUPPORTED_CALENDAR');
  });
  it('errors', () => {
    expect(codeOf(() => formatDate('not a date'))).toBe('INVALID_DATE');
    expect(codeOf(() => formatDate(new Date(Number.NaN)))).toBe('INVALID_DATE');
    expect(codeOf(() => formatDate(0, { timeZone: 'Mars/Olympus' }))).toBe('INVALID_OPTION');
    expect(codeOf(() => formatDate(0, { format: "d 'ی" }))).toBe('INVALID_PATTERN');
    expect(codeOf(() => formatDate(0, { format: '' }))).toBe('INVALID_PATTERN');
  });
  it('does not mutate the input Date', () => {
    const d = new Date('2026-03-21T09:05:07Z');
    const t = d.getTime();
    formatDate(d, { timeZone: 'Asia/Baghdad', format: 'full' });
    expect(d.getTime()).toBe(t);
  });
});

describe('currency', () => {
  it('built-ins and lookup', () => {
    expect(getCurrency('iqd')).toBe(CURRENCIES.IQD);
    expect(codeOf(() => getCurrency('XYZ'))).toBe('UNKNOWN_CURRENCY');
    expect(Object.isFrozen(CURRENCIES)).toBe(true);
  });
  it('custom currency definitions', () => {
    const def = { code: 'GBP', symbol: '£', name: 'پاوەند', fractionDigits: 2, position: 'before' as const };
    expect(formatCurrency(12, { currency: def, numerals: 'latn', separator: '' })).toBe('£12.00');
  });
  it('rejects invalid display', () => {
    expect(codeOf(() => formatCurrency(1, { display: 'emoji' as never }))).toBe('INVALID_OPTION');
  });
});
