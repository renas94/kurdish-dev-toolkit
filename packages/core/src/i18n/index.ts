import { KdtError } from '../errors.js';
import { formatNumber } from '../numbers/format.js';
import { assertNumeralSystem, type NumeralSystem } from '../numbers/digits.js';

export { soraniMessages, englishMessages } from './messages.js';

/** A nested message tree. Leaves are strings. Objects with plural keys are plural messages. */
export interface Messages {
  readonly [key: string]: string | Messages;
}

/** CLDR plural categories. */
export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

const PLURAL_KEYS: ReadonlySet<string> = new Set(['zero', 'one', 'two', 'few', 'many', 'other']);

/**
 * CLDR plural category of `count` for `locale`. Central Kurdish (`ckb`), Kurdish (`ku`) and English
 * are built in (one: n = 1, other: everything else), so their results never depend on the runtime.
 * Other locales use `Intl.PluralRules` when it is available, and `'other'` when it is not.
 */
export function pluralCategory(locale: string, count: number): PluralCategory {
  const lang = locale.toLowerCase().split(/[-_]/)[0];
  if (lang === 'ckb' || lang === 'ku' || lang === 'en') {
    return Math.abs(count) === 1 ? 'one' : 'other';
  }
  try {
    return new Intl.PluralRules(locale).select(count) as PluralCategory;
  } catch {
    return 'other';
  }
}

/** Interpolation values. Numbers and bigints are formatted with the translator's numeral system. */
export type TranslationParams = Readonly<Record<string, string | number | bigint>>;

/** Options for {@link createTranslator}. */
export interface TranslatorOptions {
  /** Active locale, e.g. `'ckb'` or `'ckb-IQ'`. Region subtags fall back to the base language. */
  readonly locale: string;
  /** Locales to try, in order, when a key is missing in `locale`. [[]] */
  readonly fallbackLocale?: string | readonly string[];
  /** Messages keyed by locale. */
  readonly messages: Readonly<Record<string, Messages>>;
  /**
   * Numeral system used for numeric parameters, or `false` to insert numbers with `String()`.
   * ['arab' for ckb, otherwise false]
   */
  readonly numerals?: NumeralSystem | false;
  /** What to do when no locale has the key: return the key, or throw `MISSING_TRANSLATION`. ['key'] */
  readonly missing?: 'key' | 'throw';
  /** Called every time a key is missing in every locale (for logging or collecting keys). */
  readonly onMissing?: (key: string, locale: string) => void;
}

/** A translation function bound to a locale. Created by {@link createTranslator}. */
export interface Translator {
  /** Translates `key`, a dot-separated path such as `'auth.welcome'`. */
  (key: string, params?: TranslationParams): string;
  readonly locale: string;
  /** True when `key` exists in the active locale or one of its fallbacks. */
  has(key: string): boolean;
  /** A new translator with a different locale and the same messages and options. */
  withLocale(locale: string): Translator;
}

function localeChain(locale: string, fallbacks: readonly string[]): string[] {
  const chain: string[] = [];
  for (const tag of [locale, ...fallbacks]) {
    const parts = tag.replace(/_/g, '-').split('-');
    for (let i = parts.length; i > 0; i--) {
      const candidate = parts.slice(0, i).join('-');
      if (!chain.includes(candidate)) chain.push(candidate);
    }
  }
  return chain;
}

function lookup(messages: Messages | undefined, key: string): string | Messages | undefined {
  let node: string | Messages | undefined = messages;
  for (const segment of key.split('.')) {
    if (node === undefined || typeof node === 'string') return undefined;
    node = Object.prototype.hasOwnProperty.call(node, segment) ? node[segment] : undefined;
  }
  return node;
}

function isPluralNode(node: Messages): boolean {
  const keys = Object.keys(node);
  return keys.length > 0 && keys.includes('other') && keys.every((k) => PLURAL_KEYS.has(k) && typeof node[k] === 'string');
}

/**
 * Creates a translator. Supports nested keys, `{param}` interpolation, plural messages selected by
 * the `count` parameter (an explicit `zero` form is used when `count` is 0), fallback locales and
 * reporting of missing keys.
 *
 * @example
 * const t = createTranslator({
 *   locale: 'ckb',
 *   fallbackLocale: 'en',
 *   messages: { ckb: soraniMessages, en: englishMessages },
 * });
 * t('auth.welcome', { name: 'ئاراس' }); // 'بەخێربێیت، ئاراس!'
 * t('messages.count', { count: 3 });    // '٣ پەیام'
 */
export function createTranslator(options: TranslatorOptions): Translator {
  if (!options || typeof options.locale !== 'string' || options.locale === '') {
    throw new KdtError('INVALID_OPTION', 'createTranslator() needs a non-empty "locale"');
  }
  if (options.numerals !== undefined && options.numerals !== false) assertNumeralSystem(options.numerals);
  const fallbacks = options.fallbackLocale === undefined
    ? []
    : typeof options.fallbackLocale === 'string' ? [options.fallbackLocale] : [...options.fallbackLocale];
  const chain = localeChain(options.locale, fallbacks);
  const isSorani = options.locale.toLowerCase().startsWith('ckb');
  const numerals: NumeralSystem | false = options.numerals ?? (isSorani ? 'arab' : false);

  const formatParam = (value: string | number | bigint): string => {
    if (typeof value === 'string') return value;
    if (numerals === false) return String(value);
    if (typeof value === 'number' && !Number.isFinite(value)) return String(value);
    return formatNumber(value, { numerals, maximumFractionDigits: 20 });
  };

  const resolve = (key: string): { node: string | Messages; locale: string } | undefined => {
    for (const locale of chain) {
      const node = lookup(options.messages[locale], key);
      if (node !== undefined) return { node, locale };
    }
    return undefined;
  };

  const translate = (key: string, params: TranslationParams = {}): string => {
    const found = resolve(key);
    const foundNode = found?.node;
    let template: string | undefined;
    if (typeof foundNode === 'string') {
      template = foundNode;
    } else if (found && foundNode !== undefined && isPluralNode(foundNode)) {
      const node = foundNode as Readonly<Record<string, string>>;
      const count = params.count;
      const n = typeof count === 'bigint' ? Number(count) : typeof count === 'number' ? count : Number.NaN;
      if (Number.isNaN(n)) {
        throw new KdtError('INVALID_OPTION', `Plural message "${key}" needs a numeric "count" parameter`);
      }
      const category = n === 0 && node.zero !== undefined ? 'zero' : pluralCategory(found.locale, n);
      template = node[category] ?? node.other;
    }
    if (template === undefined) {
      options.onMissing?.(key, options.locale);
      if (options.missing === 'throw') {
        throw new KdtError('MISSING_TRANSLATION', `Missing translation "${key}" for locale "${options.locale}"`);
      }
      return key;
    }
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      Object.prototype.hasOwnProperty.call(params, name) ? formatParam(params[name]!) : match,
    );
  };

  const t = translate as Translator;
  Object.defineProperties(t, {
    locale: { value: options.locale, enumerable: true },
    has: {
      value: (key: string): boolean => {
        const node = resolve(key)?.node;
        if (node === undefined) return false;
        return typeof node === 'string' ? true : isPluralNode(node);
      },
    },
    withLocale: { value: (locale: string) => createTranslator({ ...options, locale }) },
  });
  return t;
}

/** Flattens a message tree into dot-separated keys: `{ a: { b: 'x' } }` → `{ 'a.b': 'x' }`. */
export function flattenMessages(messages: Messages, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(messages)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out[path] = value;
    else Object.assign(out, flattenMessages(value, path));
  }
  return out;
}

/**
 * Lists keys that are in `reference` but not in `target`. Use it in tests or CI to keep translations
 * complete.
 *
 * @example
 * findMissingKeys(englishMessages, soraniMessages); // []
 */
export function findMissingKeys(reference: Messages, target: Messages): string[] {
  const have = flattenMessages(target);
  return Object.keys(flattenMessages(reference)).filter((k) => !(k in have));
}
