import { describe, expect, it } from 'vitest';
import {
  compareSorani,
  createSoraniComparator,
  explainNormalization,
  isSorani,
  isSoraniLetter,
  looseEquals,
  looseIncludes,
  normalize,
  removeDiacritics,
  searchKey,
  SORANI_ALPHABET,
  soraniScore,
  validateSorani,
} from '../src/text/index.js';

describe('alphabet', () => {
  it('has 33 unique letters', () => {
    expect(SORANI_ALPHABET).toHaveLength(33);
    expect(new Set(SORANI_ALPHABET).size).toBe(33);
    expect(Object.isFrozen(SORANI_ALPHABET)).toBe(true);
  });
  it('isSoraniLetter', () => {
    expect(isSoraniLetter('ڵ')).toBe(true);
    expect(isSoraniLetter('ھ')).toBe(true);
    expect(isSoraniLetter('ي')).toBe(false);
    expect(isSoraniLetter('ث')).toBe(false);
    expect(isSoraniLetter('a')).toBe(false);
  });
});

describe('isSorani / soraniScore', () => {
  it('recognises Sorani sentences', () => {
    expect(isSorani('من کوردم و لە هەولێر دەژیم')).toBe(true);
    expect(isSorani('زمانی کوردی زمانێکی جوانە')).toBe(true);
    expect(isSorani('سڵاو، چۆنی؟')).toBe(true);
  });
  it('rejects Arabic, Persian and Latin text', () => {
    expect(isSorani('أنا أعيش في بغداد')).toBe(false);
    expect(isSorani('من در تهران زندگی می‌کنم')).toBe(false);
    expect(isSorani('Hello world')).toBe(false);
    expect(isSorani('')).toBe(false);
  });
  it('scores between 0 and 1 and respects threshold', () => {
    const s = soraniScore('من کوردم و لە هەولێر دەژیم');
    expect(s).toBeCloseTo(0.5);
    expect(isSorani('من کوردم و لە هەولێر دەژیم', { threshold: 0.6 })).toBe(false);
  });
});

describe('normalize', () => {
  it('never mutates input and is idempotent', () => {
    const input = 'كوردستانى مه‌زن';
    const once = normalize(input);
    expect(input).toBe('كوردستانى مه‌زن');
    expect(normalize(once)).toBe(once);
    expect(once).toBe('کوردستانی مەزن');
  });
  it('explains every change with offsets into the original', () => {
    const report = explainNormalization('كتاب مه‌لا');
    expect(report.output).toBe('کتاب مەلا');
    expect(report.changes).toEqual([
      { index: 0, length: 1, from: 'ك', to: 'ک', rule: 'kaf' },
      { index: 6, length: 2, from: 'ه‌', to: 'ە', rule: 'hehZwnj' },
    ]);
  });
  it('reports diacritic removal positions', () => {
    const report = explainNormalization('بَب', { diacritics: true });
    expect(report.output).toBe('بب');
    expect(report.changes).toEqual([{ index: 1, length: 1, from: 'َ', to: '', rule: 'diacritics' }]);
  });
  it('handles astral characters without breaking surrogate pairs', () => {
    expect(normalize('😀ك😀')).toBe('😀ک😀');
    expect(explainNormalization('😀ك').changes[0]?.index).toBe(2);
  });
  it('rejects invalid options', () => {
    expect(() => normalize('x', { h: 'bogus' as never })).toThrowError(/Invalid "h"/);
    expect(() => normalize('x', { digits: 'roman' as never })).toThrowError(/numeral system/);
    expect(() => normalize(42 as never)).toThrowError();
  });
  it('removeDiacritics only removes marks', () => {
    expect(removeDiacritics('كَتَبَ')).toBe('كتب');
  });
});

describe('validateSorani', () => {
  it('returns no issues for clean text', () => {
    expect(validateSorani('زمانی کوردی زمانێکی جوانە. Hello 123!')).toEqual([]);
  });
  it('reports look-alike letters with suggestions', () => {
    const issues = validateSorani('كوردي');
    expect(issues).toEqual([
      { type: 'arabic-kaf', index: 0, char: 'ك', suggestion: 'ک' },
      { type: 'arabic-yeh', index: 4, char: 'ي', suggestion: 'ی' },
    ]);
  });
  it('reports legacy ae and non-Sorani letters', () => {
    const types = validateSorani('مه‌لا ثابت').map((i) => i.type);
    expect(types).toEqual(['heh-zwnj', 'non-sorani-letter']);
  });
});

describe('sorting', () => {
  it('follows Sorani alphabetical order', () => {
    const words = ['ێوارە', 'زەوی', 'ڕێگا', 'ئاو', 'رووناک', 'ۆ', 'لاو', 'ڵ', 'ەو', 'هەولێر', 'وشە', 'یەک'];
    expect([...words].sort(compareSorani)).toEqual([
      'ئاو', 'رووناک', 'ڕێگا', 'زەوی', 'لاو', 'ڵ', 'هەولێر', 'ەو', 'وشە', 'ۆ', 'یەک', 'ێوارە',
    ]);
  });
  it('treats look-alike letters as equal when normalizing', () => {
    expect(compareSorani('کورد', 'كورد')).not.toBe(0); // deterministic tie-break
    const words = ['كورد', 'کوردستان', 'کوردی'];
    expect(words.sort(compareSorani)).toEqual(['كورد', 'کوردستان', 'کوردی']);
  });
  it('sorts shorter prefix first and digits by value', () => {
    expect(['کوردی', 'کورد'].sort(compareSorani)).toEqual(['کورد', 'کوردی']);
    expect(['٣', '2', '۱'].sort(compareSorani)).toEqual(['۱', '2', '٣']);
  });
  it('can disable normalization', () => {
    const cmp = createSoraniComparator({ normalize: false });
    // Arabic yeh is not a Sorani letter, so it sorts after all Sorani letters.
    expect(['ي', 'ێ'].sort(cmp)).toEqual(['ێ', 'ي']);
  });
});

describe('search helpers', () => {
  it('builds folded keys', () => {
    expect(searchKey('كوردستانى  ٢٠٢٦')).toBe('کوردستانی 2026');
    expect(searchKey('  HeLLo‏  ')).toBe('hello');
  });
  it('matches loosely across variants', () => {
    expect(looseEquals('كوردي', 'کوردی')).toBe(true);
    expect(looseEquals('شاره', 'شارە')).toBe(true);
    expect(looseIncludes('بەخێربێن بۆ ھەولێر', 'هەولێر')).toBe(true);
    expect(looseIncludes('سـڵـاو', 'سڵاو')).toBe(true);
    expect(looseIncludes('سڵاو', 'کورد')).toBe(false);
  });
});
