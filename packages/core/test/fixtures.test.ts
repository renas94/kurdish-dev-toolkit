// Runs the language-neutral fixtures in /tests/fixtures. The PHP package will run the same files.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { formatCurrency, formatDate, formatNumber, KdtError, normalize, parseNumber } from '../src/index.js';

function fixture<T>(name: string): T {
  const url = new URL(`../../../tests/fixtures/${name}.json`, import.meta.url);
  return JSON.parse(readFileSync(fileURLToPath(url), 'utf8')) as T;
}

type Opts = Record<string, unknown>;

describe('fixtures: normalize', () => {
  const { cases } = fixture<{ cases: { name: string; input: string; options?: Opts; expected: string }[] }>('normalize');
  it.each(cases)('$name', ({ input, options, expected }) => {
    expect(normalize(input, options)).toBe(expected);
  });
});

describe('fixtures: numbers', () => {
  const data = fixture<{
    format: { value: number | string; options?: Opts; expected: string }[];
    parse: { input: string; options?: Opts; expected: number }[];
    parseErrors: string[];
  }>('numbers');

  it.each(data.format)('formatNumber($value) → $expected', ({ value, options, expected }) => {
    expect(formatNumber(value, options)).toBe(expected);
  });
  it.each(data.parse)('parseNumber($input) → $expected', ({ input, options, expected }) => {
    expect(parseNumber(input, options)).toBe(expected);
  });
  it.each(data.parseErrors)('parseNumber(%j) throws PARSE_ERROR', (input) => {
    expect(() => parseNumber(input)).toThrowError(expect.objectContaining({ code: 'PARSE_ERROR' }) as unknown as KdtError);
  });
});

describe('fixtures: dates', () => {
  const { cases } = fixture<{ cases: { date: string; timeZone: string; format: string; numerals?: 'latn' | 'arab' | 'arabext'; expected: string }[] }>('dates');
  it.each(cases)('$date [$timeZone] "$format"', ({ date, timeZone, format, numerals, expected }) => {
    expect(formatDate(date, { timeZone, format, ...(numerals ? { numerals } : {}) })).toBe(expected);
  });
});

describe('fixtures: currency', () => {
  const { cases } = fixture<{ cases: { amount: number | string; options?: Opts; expected: string }[] }>('currency');
  it.each(cases)('formatCurrency($amount) → $expected', ({ amount, options, expected }) => {
    expect(formatCurrency(amount, options)).toBe(expected);
  });
});
