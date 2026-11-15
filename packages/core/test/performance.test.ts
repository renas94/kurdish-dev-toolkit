// Guards against pathological slowdowns (e.g. regular-expression backtracking) on large or hostile
// input. The limits are generous so the tests stay stable on slow CI machines.
import { describe, expect, it } from 'vitest';
import {
  explainNormalization,
  formatDate,
  getDirection,
  parseNumber,
  searchKey,
  splitByDirection,
  validateSorani,
} from '../src/index.js';

const LIMIT_MS = 2000;

function timed(fn: () => unknown): number {
  const start = performance.now();
  fn();
  return performance.now() - start;
}

describe('performance on large input', () => {
  const sorani = 'زمانی کوردی زمانێکی جوانە، Hello ١٢٣ مه‌لا كوردي. '.repeat(5_000); // ~250k chars

  it('text functions stay linear', () => {
    expect(timed(() => explainNormalization(sorani, { diacritics: true, finalHeh: true, initialReh: true }))).toBeLessThan(LIMIT_MS);
    expect(timed(() => searchKey(sorani))).toBeLessThan(LIMIT_MS);
    expect(timed(() => validateSorani(sorani))).toBeLessThan(LIMIT_MS);
  });

  it('rtl functions stay linear', () => {
    expect(timed(() => splitByDirection(sorani))).toBeLessThan(LIMIT_MS);
    expect(timed(() => getDirection('1 '.repeat(100_000) + 'a', { strategy: 'majority' }))).toBeLessThan(LIMIT_MS);
  });

  it('parseNumber rejects hostile input quickly', () => {
    const digits = '1'.repeat(50_000);
    expect(timed(() => expect(() => parseNumber(digits + 'x')).toThrow())).toBeLessThan(LIMIT_MS);
    expect(timed(() => expect(() => parseNumber('1,' + '111,'.repeat(10_000) + '11')).toThrow())).toBeLessThan(LIMIT_MS);
    expect(timed(() => parseNumber(digits))).toBeLessThan(LIMIT_MS);
  });

  it('formatDate handles long patterns', () => {
    const pattern = "d MMMM 'ی' ".repeat(2_000);
    expect(timed(() => formatDate(0, { timeZone: 'UTC', format: pattern }))).toBeLessThan(LIMIT_MS);
  });
});
