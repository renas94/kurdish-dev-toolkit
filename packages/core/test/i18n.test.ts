import { describe, expect, it, vi } from 'vitest';
import {
  createTranslator,
  englishMessages,
  findMissingKeys,
  flattenMessages,
  pluralCategory,
  soraniMessages,
} from '../src/i18n/index.js';
import { KdtError } from '../src/errors.js';

const messages = { ckb: soraniMessages, en: englishMessages };

describe('createTranslator', () => {
  const t = createTranslator({ locale: 'ckb', fallbackLocale: 'en', messages });

  it('translates nested keys', () => {
    expect(t('common.save')).toBe('پاشەکەوتکردن');
    expect(t.locale).toBe('ckb');
  });
  it('interpolates parameters', () => {
    expect(t('auth.welcome', { name: 'ئاراس' })).toBe('بەخێربێیت، ئاراس!');
    expect(t('auth.welcome')).toBe('بەخێربێیت، {name}!');
  });
  it('formats numeric params with Sorani digits by default', () => {
    expect(t('validation.minLength', { min: 8 })).toBe('لانیکەم ٨ پیت بنووسە');
    const latin = createTranslator({ locale: 'ckb', messages, numerals: 'latn' });
    expect(latin('validation.minLength', { min: 8 })).toBe('لانیکەم 8 پیت بنووسە');
    const en = t.withLocale('en');
    expect(en('validation.minLength', { min: 1234 })).toBe('Enter at least 1234 characters');
  });
  it('pluralizes', () => {
    expect(t('messages.count', { count: 0 })).toBe('هیچ پەیامێک نییە');
    expect(t('messages.count', { count: 1 })).toBe('١ پەیام');
    expect(t('messages.count', { count: 1500 })).toBe('١٬٥٠٠ پەیام');
    const en = t.withLocale('en');
    expect(en('messages.count', { count: 1 })).toBe('1 message');
    expect(en('messages.count', { count: 2 })).toBe('2 messages');
    expect(en('messages.count', { count: 2n })).toBe('2 messages');
    expect(() => t('messages.count')).toThrowError(KdtError);
  });
  it('falls back from region to language and to fallback locale', () => {
    const t2 = createTranslator({
      locale: 'ckb-IQ',
      fallbackLocale: ['en'],
      messages: { 'ckb-IQ': { only: 'تەنها' }, ckb: { a: 'ئا' }, en: { a: 'A', b: 'B' } },
    });
    expect(t2('only')).toBe('تەنها');
    expect(t2('a')).toBe('ئا');
    expect(t2('b')).toBe('B');
    expect(t2.has('b')).toBe(true);
    expect(t2.has('c')).toBe(false);
    expect(t2.has('a.b')).toBe(false);
  });
  it('reports missing keys', () => {
    const onMissing = vi.fn();
    const t3 = createTranslator({ locale: 'ckb', messages, onMissing });
    expect(t3('nope.key')).toBe('nope.key');
    expect(t3('common')).toBe('common'); // a branch, not a message
    expect(onMissing).toHaveBeenCalledWith('nope.key', 'ckb');
    const strict = createTranslator({ locale: 'ckb', messages, missing: 'throw' });
    expect(() => strict('nope')).toThrowError(expect.objectContaining({ code: 'MISSING_TRANSLATION' }) as unknown as Error);
  });
  it('does not resolve prototype properties', () => {
    expect(t('toString')).toBe('toString');
    expect(t('common.constructor')).toBe('common.constructor');
  });
  it('validates options', () => {
    expect(() => createTranslator({ locale: '', messages })).toThrowError(KdtError);
    expect(() => createTranslator({ locale: 'ckb', messages, numerals: 'x' as never })).toThrowError(KdtError);
  });
});

describe('plural rules', () => {
  it('built-in ckb/en', () => {
    expect(pluralCategory('ckb', 1)).toBe('one');
    expect(pluralCategory('ckb', 0)).toBe('other');
    expect(pluralCategory('ckb-IQ', 2)).toBe('other');
    expect(pluralCategory('en', 1)).toBe('one');
  });
  it('other locales via Intl, or "other"', () => {
    expect(['few', 'other']).toContain(pluralCategory('ar', 3));
    expect(pluralCategory('not-a-locale-!!', 1)).toBe('other');
  });
});

describe('message tooling', () => {
  it('flattens', () => {
    expect(flattenMessages({ a: { b: 'x', c: { d: 'y' } }, e: 'z' })).toEqual({ 'a.b': 'x', 'a.c.d': 'y', e: 'z' });
  });
  it('built-in Sorani and English bundles have the same keys', () => {
    expect(findMissingKeys(englishMessages, soraniMessages)).toEqual([]);
    expect(findMissingKeys(soraniMessages, englishMessages)).toEqual([]);
    expect(findMissingKeys({ a: 'x', b: { c: 'y' } }, { a: 'x' })).toEqual(['b.c']);
  });
});
