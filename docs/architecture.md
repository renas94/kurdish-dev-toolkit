# KDT Architecture

## Package layout (changed from the original brief, and why)

The brief proposed separate npm packages for `text`, `rtl`, `dates`, `numbers`, `currency` and `i18n`.
These modules depend on each other: currency uses numbers, dates use numbers, i18n uses numbers, and
everything uses the shared locale data. Splitting them into separate packages would mean six version
numbers that must stay in sync, with no benefit to bundle size. Instead:

* **One core package, `@kurdish-dev-toolkit/core`**, with **subpath exports** (`/text`, `/rtl`,
  `/numbers`, `/dates`, `/currency`, `/i18n`) and `"sideEffects": false`. Bundlers drop unused modules, and
  each subpath works as a standalone import.
* Framework packages are separate, because they have peer dependencies: `@kurdish-dev-toolkit/react`
  (phase 5) and the Next.js helpers (phase 6, possibly inside the React package).
* The PHP package (`kurdish-dev-toolkit/kdt`, phase 3) gets its own Composer package. It is checked
  against the **shared JSON fixtures** in `tests/fixtures/`, which the JS test suite already uses, so
  both languages produce the same output.
* `klpt-adapter` is optional and comes later. Python is never a required dependency.

No package is created before its phase starts.

```
kurdish-dev-toolkit/
├─ packages/core/          @kurdish-dev-toolkit/core (TypeScript, ESM, zero runtime deps)
│  ├─ src/{text,rtl,numbers,dates,currency,i18n,locale-data,errors}
│  └─ test/
├─ tests/fixtures/         language-neutral JSON test cases (JS now, PHP in phase 3)
├─ docs/                   research, architecture, module guides (docs site later)
└─ examples/               runnable examples
```

## Dependency strategy

* The core has **zero runtime dependencies**.
* It uses only ES2022 built-ins. `Intl` is used for exactly two things that are reliable everywhere:
  rounding numbers with the `en` locale (`Intl.NumberFormat('en')`) and reading date fields in a time
  zone (`Intl.DateTimeFormat('en-US', {timeZone})`). It never reads Kurdish data from `Intl`.
* Dev dependencies: `typescript`, `vitest`, `typedoc`.

## API principles

1. **Never change input implicitly.** Normalization runs only through `normalize()`, and each rule can
   be turned on or off. `explainNormalization()` reports every change.
2. **Never silently convert calendars.** Date functions accept `calendar: 'gregorian'` and throw
   `KdtError('UNSUPPORTED_CALENDAR')` for anything else.
3. **Sensible defaults for Sorani, overridable everywhere.** By default, numbers use Arabic-Indic digits
   (`٠١٢…`, the CLDR default for `ckb`), `٫` as the decimal separator and `٬` for grouping.
4. **Errors are typed.** Every error is a `KdtError` with a stable `code`.
5. **The same output on every runtime.**

## Public API v0.1 (phase 1)

| Module | Exports |
|---|---|
| `text` | `SORANI_ALPHABET`, `isSoraniLetter`, `soraniScore`, `isSorani`, `normalize`, `explainNormalization`, `validateSorani`, `compareSorani`, `createSoraniComparator`, `searchKey`, `looseEquals`, `looseIncludes`, `removeDiacritics` |
| `rtl` | `isRtlChar`, `isStrongLtrChar`, `getDirection`, `isRtlLocale`, `localeDirection`, `isolate`, `stripBidiControls`, `splitByDirection`, `htmlDirAttributes`, `mirrorSide`, `BIDI` |
| `numbers` | `DIGITS`, `convertDigits`, `formatNumber`, `parseNumber` |
| `dates` | `SORANI_MONTHS`, `SORANI_WEEKDAYS`, `formatDate`, `formatTime`, `getDateParts` |
| `currency` | `CURRENCIES`, `formatCurrency`, `getCurrency` |
| `i18n` | `createTranslator`, `pluralCategory`, `flattenMessages`, `findMissingKeys`, `soraniMessages`, `englishMessages` |
| root | everything above, plus `KdtError` |

## Testing strategy

* Vitest unit tests for every public function, using real Sorani sentences.
* Shared JSON fixtures (`tests/fixtures/*.json`) for normalization, numbers, dates and currency. The
  PHP port will be tested against the same files.
* Unicode edge cases: ZWNJ, combining marks, tatweel, bidi controls, astral characters (emoji), and
  mixed scripts.
* Tests are run in CI on Node 20, 22 and 24 (CI is set up in phase 2). Browser support is claimed only
  after browser tests run.

## Roadmap

| Phase | Deliverable | Status |
|---|---|---|
| 1 | TypeScript core: text, rtl, numbers, dates, currency, i18n | in progress |
| 2 | npm readiness: CI matrix, TypeDoc, changelog, release workflow, community files | planned |
| 3 | PHP 8.2+ Composer package using the shared fixtures | planned |
| 4 | Laravel service provider, config, translations, Blade helpers | planned |
| 5 | React hooks (`useDirection`, `useTranslator`, `useFormatters`), `<Bidi>` component | planned |
| 6 | Next.js App Router examples (server `lang`/`dir`, middleware locale) | planned |
| later | Jalali/Kurdish solar calendar (optional companion: tsroj, GPL), KLPT adapter, legacy-font (Ali-K) conversion, docs website | backlog |

## Sorani Unicode and RTL challenges

1. **Look-alike letters**: ي U+064A / ى U+0649 vs ی U+06CC, and ك U+0643 vs ک U+06A9. These come from
   Arabic and Persian keyboards and break search and sorting.
2. **The vowel e (ە U+06D5)**: legacy text writes it as ه+ZWNJ, as a word-final ه, or as ة.
3. **The letter h**: some text uses ھ U+06BE and some uses ه U+0647.
4. **Rolled r (ڕ U+0695)**: older text writes it as ڒ U+0692. Sorani words never begin with a plain ر.
5. **ZWNJ (U+200C)** has meaning (it separates letters that should not join), so it must not be removed
   blindly.
6. **Three digit systems** that look alike (٤٥٦ vs ۴۵۶), with Arabic separators ٫ and ٬.
7. **Bidi**: negative numbers, phone numbers, URLs and English words inside Sorani text. Arabic-Indic
   digits are weak (AN) characters, so `-١٢` can render with the sign in the wrong place unless an ALM
   (U+061C) is added.
8. **Sorting**: Sorani alphabetical order (ڕ after ر, ڵ after ل, ە after ه, ۆ after و, ێ after ی) is
   not Unicode code-point order, and ICU has no `ckb` collation.
9. **Locale data varies by runtime**, and CLDR's own spellings are inconsistent (see the research report).
10. **Ezafe in dates**: `٢١ی ئازاری ٢٠٢٦` (the day takes the ی suffix, and so does the month).
11. **Legacy non-Unicode fonts** (Ali-K and similar) are still in circulation. Planned for later.
