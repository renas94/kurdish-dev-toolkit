import { describe, expect, it } from 'vitest';
import {
  BIDI,
  getDirection,
  htmlDirAttributes,
  isolate,
  isRtlChar,
  isRtlLocale,
  isStrongLtrChar,
  localeDirection,
  mirrorSide,
  splitByDirection,
  stripBidiControls,
} from '../src/rtl/index.js';

describe('character classes', () => {
  it('detects strong RTL letters', () => {
    for (const ch of ['ڵ', 'ە', 'ۆ', 'ا', 'ש', 'ܐ']) expect(isRtlChar(ch)).toBe(true);
    for (const ch of ['a', '١', '1', '،', ' ', '😀', 'َ']) expect(isRtlChar(ch)).toBe(false);
  });
  it('detects strong LTR letters', () => {
    expect(isStrongLtrChar('a')).toBe(true);
    expect(isStrongLtrChar('ж')).toBe(true);
    expect(isStrongLtrChar('ڵ')).toBe(false);
    expect(isStrongLtrChar('5')).toBe(false);
  });
});

describe('getDirection', () => {
  it('uses first strong character by default', () => {
    expect(getDirection('سڵاو، Hello')).toBe('rtl');
    expect(getDirection('Hello سڵاو')).toBe('ltr');
    expect(getDirection('١٢٣ سڵاو')).toBe('rtl');
    expect(getDirection('"(123) — iPhone"')).toBe('ltr');
  });
  it('falls back when no strong letters', () => {
    expect(getDirection('١٢٣ - 456 !')).toBe('ltr');
    expect(getDirection('', { fallback: 'rtl' })).toBe('rtl');
  });
  it('majority strategy', () => {
    expect(getDirection('iPhone ١٥ نوێترین مۆدێلە', { strategy: 'majority' })).toBe('rtl');
    expect(getDirection('iPhone ١٥ نوێترین مۆدێلە')).toBe('ltr');
    expect(getDirection('ab سڵ', { strategy: 'majority', fallback: 'rtl' })).toBe('rtl');
  });
  it('rejects unknown strategies', () => {
    expect(() => getDirection('x', { strategy: 'nope' as never })).toThrowError(/strategy/);
  });
});

describe('locales', () => {
  it.each([
    ['ckb', true], ['ckb-IQ', true], ['ckb_IR', true], ['CKB', true], ['ckb-Latn', false], ['ku', false],
    ['ku-Arab', true], ['kmr', false], ['ar', true], ['fa-IR', true], ['he', true], ['en-US', false], ['sdh', true],
  ])('isRtlLocale(%s) = %s', (locale, expected) => {
    expect(isRtlLocale(locale)).toBe(expected);
  });
  it('localeDirection and validation', () => {
    expect(localeDirection('ckb')).toBe('rtl');
    expect(localeDirection('en')).toBe('ltr');
    expect(() => isRtlLocale('')).toThrowError();
  });
});

describe('isolation and controls', () => {
  it('wraps with isolates', () => {
    expect(isolate('john_doe')).toBe(`${BIDI.FSI}john_doe${BIDI.PDI}`);
    expect(isolate('abc', 'ltr')).toBe('⁦abc⁩');
    expect(isolate('سڵاو', 'rtl')).toBe('⁧سڵاو⁩');
  });
  it('strips bidi controls but keeps ZWNJ', () => {
    expect(stripBidiControls('‏؜-١٢⁦x⁩ دەست‌پێک')).toBe('-١٢x دەست‌پێک');
  });
});

describe('splitByDirection', () => {
  it('splits mixed Kurdish/English text', () => {
    expect(splitByDirection('من React بەکاردێنم')).toEqual([
      { text: 'من', direction: 'rtl' },
      { text: ' ', direction: 'neutral' },
      { text: 'React', direction: 'ltr' },
      { text: ' ', direction: 'neutral' },
      { text: 'بەکاردێنم', direction: 'rtl' },
    ]);
  });
  it('keeps multi-word runs together', () => {
    expect(splitByDirection('Hello World سڵاو')).toEqual([
      { text: 'Hello World', direction: 'ltr' },
      { text: ' ', direction: 'neutral' },
      { text: 'سڵاو', direction: 'rtl' },
    ]);
  });
  it('round-trips the text exactly', () => {
    const s = 'نرخ: 25$ (USD) — ٣ دانە 😀';
    expect(splitByDirection(s).map((r) => r.text).join('')).toBe(s);
    expect(splitByDirection('')).toEqual([]);
  });
});

describe('html helpers', () => {
  it('htmlDirAttributes', () => {
    expect(htmlDirAttributes({ lang: 'ckb' })).toEqual({ dir: 'rtl', lang: 'ckb' });
    expect(htmlDirAttributes({ text: 'Hello' })).toEqual({ dir: 'ltr' });
    expect(htmlDirAttributes({ text: 'سڵاو' })).toEqual({ dir: 'rtl' });
    expect(htmlDirAttributes({})).toEqual({ dir: 'auto' });
  });
  it('mirrorSide', () => {
    expect(mirrorSide('left', 'rtl')).toBe('right');
    expect(mirrorSide('right', 'rtl')).toBe('left');
    expect(mirrorSide('left', 'ltr')).toBe('left');
  });
});
