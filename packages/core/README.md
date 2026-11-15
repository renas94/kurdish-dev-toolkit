# @kurdish-dev-toolkit/core

Kurdish Sorani (Central Kurdish, `ckb`) utilities for JavaScript and TypeScript applications: text
normalization and validation, RTL/bidi helpers, numerals, dates, currency and i18n.

* Zero runtime dependencies. ESM only. TypeScript declarations included.
* The output does not depend on the runtime's locale data. Kurdish month names, separators and
  similar data are bundled with the package and reviewed.
* Input is never normalized implicitly, and calendars are never converted silently.

> **Status: `0.1.0-alpha.0`, not yet published to npm.** The API may change before 1.0.
> Tested on Node.js 24 (Windows). CI coverage for Node 20/22 and browsers comes in phase 2.

## Install

```sh
npm install @kurdish-dev-toolkit/core
```

Requires Node.js ≥ 20 or a modern browser (ES2022, `Intl.NumberFormat` with `signDisplay: 'negative'`).

## Quick start

```ts
import { normalize, formatNumber, formatDate, formatCurrency, getDirection, createTranslator,
         soraniMessages, englishMessages } from '@kurdish-dev-toolkit/core';

normalize('كوردي');                                    // 'کوردی'
formatNumber(1234567.891);                             // '١٬٢٣٤٬٥٦٧٫٨٩١'
formatDate('2026-03-21T09:00:00Z', { timeZone: 'Asia/Baghdad', format: 'full' });
                                                       // 'شەممە، ٢١ی ئازاری ٢٠٢٦'
formatCurrency(1250000);                               // '١٬٢٥٠٬٠٠٠ د.ع'
getDirection('سڵاو Hello');                            // 'rtl'

const t = createTranslator({ locale: 'ckb', fallbackLocale: 'en',
                             messages: { ckb: soraniMessages, en: englishMessages } });
t('messages.count', { count: 3 });                     // '٣ پەیام'
```

Each module can also be imported on its own: `@kurdish-dev-toolkit/core/text`, `/rtl`, `/numbers`,
`/dates`, `/currency` and `/i18n`.

## Modules

### text

| Function | Purpose |
|---|---|
| `normalize(text, options?)` | Fixes encoding problems: `ي/ى→ی`, `ك→ک`, `ة→ە`, `ه+ZWNJ→ە`, `ھ→ه`, `ڒ→ڕ`, removes tatweel. Optional rules: word-final `ه→ە`, word-initial `ر→ڕ`, diacritic removal, bidi-control removal, digit conversion. |
| `explainNormalization(text, options?)` | Same as `normalize`, plus a list of every change (offset, original, replacement, rule). |
| `validateSorani(text)` | Finds look-alike Arabic letters and non-Sorani letters, with suggested fixes. Never changes the text. |
| `isSorani(text)`, `soraniScore(text)` | Heuristic check for Sorani text, based on letters used only in Sorani (ە ۆ ێ ڵ ڕ ڤ). |
| `compareSorani`, `createSoraniComparator` | Sorts in Sorani alphabetical order (ر < ڕ, ل < ڵ, ه < ە, و < ۆ, ی < ێ). |
| `searchKey`, `looseEquals`, `looseIncludes` | Folded keys for search that ignore spelling variants, diacritics and digit systems. |

### rtl

`getDirection`, `isRtlChar`, `isStrongLtrChar`, `isRtlLocale` (`ckb` → RTL, `ckb-Latn` → LTR,
`ku` → LTR), `localeDirection`, `isolate` (FSI/LRI/RLI…PDI), `stripBidiControls`, `splitByDirection`
(splits mixed Kurdish/English text into runs), `htmlDirAttributes`, `mirrorSide`, `BIDI`.

### numbers

`formatNumber(value, { numerals: 'arab' | 'latn' | 'arabext', ... })`, `parseNumber(text)` (accepts
any mix of digit systems plus the separators `٫` and `٬`), `convertDigits(text, to)`. To keep exact
precision, pass a bigint or a decimal string such as `'1999.995'`.

### dates

`formatDate(date, { format, timeZone, numerals })` with the styles `full`, `long`, `medium` and
`short`, or a custom pattern. `formatTime`, `getDateParts`, `SORANI_MONTHS`, `SORANI_WEEKDAYS`.
Supports the Gregorian calendar only. Any other `calendar` value throws `UNSUPPORTED_CALENDAR`.

### currency

`formatCurrency(amount, { currency: 'IQD' | 'USD' | 'EUR' | 'TRY' | 'IRR' | CurrencyDefinition, display })`.
IQD is shown with 0 fraction digits by default. KDT does not include exchange rates.

### i18n

`createTranslator` (nested keys, `{param}` interpolation, plurals, region → language → fallback
lookup, `onMissing`/`missing: 'throw'`), `pluralCategory`, `flattenMessages`, `findMissingKeys`, and
starter `soraniMessages`/`englishMessages` bundles.

## Errors

Every error is a `KdtError` with a stable `code`: `INVALID_NUMBER`, `PARSE_ERROR`, `INVALID_DATE`,
`INVALID_PATTERN`, `UNSUPPORTED_CALENDAR`, `UNKNOWN_CURRENCY`, `INVALID_OPTION`, `MISSING_TRANSLATION`.

## Related projects

KDT is for application development. For linguistic processing (tokenization, stemming,
transliteration, spell checking), use [KLPT](https://github.com/sinaahmadi/klpt). For Kurdish solar
and Jalali calendars, see [tsroj](https://github.com/0xdolan/tsroj) (GPL-3.0). KDT's normalization
rules match [Lucene's `SoraniNormalizer`](https://lucene.apache.org/core/8_1_0/analyzers-common/org/apache/lucene/analysis/ckb/SoraniNormalizer.html)
so search indexes agree.

## License

MIT
