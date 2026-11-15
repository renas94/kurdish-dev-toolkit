# Kurdish Developer Tooling Landscape (research report, November 2026)

This report records what already exists so KDT does not duplicate it. Facts were checked
against project pages on 2026-11-14. Licenses must be re-checked before any integration,
because projects can change them.

## 1. Existing projects

| Project | Language | What it does | License | Notes for KDT |
|---|---|---|---|---|
| [KLPT](https://github.com/sinaahmadi/klpt) | Python (3.6+) | `Preprocess` (normalize, standardize, unify_numerals, stopwords), `Tokenize` (word, multi-word expression, sentence), `Transliterate` (Arabic ↔ Latin script), `Stem` (spell check/correct, morphological analysis, stem, lemmatize; uses Hunspell via `chunspell`). Sorani and Kurmanji. | **CC BY-SA 4.0** | The main Kurdish NLP toolkit. Share-alike license: KDT (MIT) must not copy its code or data. Integration only as an optional external process or service. |
| [KurdishHunspell](https://github.com/sinaahmadi/KurdishHunspell) | Hunspell dictionaries | Sorani morphology and spelling dictionaries (used by KLPT) | See repo | Usable from JS through `nspell`/Hunspell bindings in a future optional adapter. Check license first. |
| [AsoSoft Library](https://github.com/AsoSoft/AsoSoft-Library) | C# (.NET 6), plus a Python port | Normalizer (letters, punctuation, numerals, HTML entities, URLs/emails), numeral converter, grapheme-to-phoneme | MIT (per registry listing) | Good reference for normalization rules. Last push Sep 2023. |
| [Apache Lucene `SoraniNormalizer`](https://lucene.apache.org/core/8_1_0/analyzers-common/org/apache/lucene/analysis/ckb/SoraniNormalizer.html) | Java | Search-oriented normalization: ي/ى→ی, ك→ک, ة/final ه/ه+ZWNJ→ە, ھ→ه, ڒ and word-initial ر→ڕ, strips harakat, tatweel and format characters | Apache-2.0 | KDT's normalization rules match this behaviour so search indexes agree. KDT reimplements from the documented rules and copies no code. |
| [Kurdînûs](https://github.com/aso-mehmudi/kurdinus) | JavaScript (browser pages) | Transliteration, normalizer, converts legacy non-Unicode fonts (Ali-K, Ali-Web, Dylan), on-screen typing | Not stated on the repo page | Web tool, not an npm library. Legacy font conversion is a real need. Possible future collaboration if a license is added. |
| [tsroj (`@0xdolan/tsroj`)](https://github.com/0xdolan/tsroj) | TypeScript | Kurdish solar, Persian (Jalali), Tabular Islamic and Gregorian calendars; `ckb`/`kmr` locales; strftime with Sorani ezafe | **GPL-3.0** | Already covers calendar conversion. KDT will not reimplement it and must not bundle it (GPL). It can be documented as an optional companion that users install themselves. |
| [hamoi1/kurdish-converter](https://packagist.org/packages/hamoi1/kurdish-converter) | PHP 8.3+, Laravel 10–12 | Number→Sorani words, currency words, time expressions, ordinals, digit conversion | MIT | No tagged stable release (dev-main only). Overlaps with KDT's future PHP number/currency helpers. Number-to-words stays out of KDT's scope for now. |
| [kurdish-numbers-to-words](https://www.github.com/kurd-cc/kurdish-numbers-to-words) | JavaScript | Number→words (Sorani, Kurmanji) | See repo | Already covers number-to-words in JS. |
| [Wergor](https://github.com/sinaahmadi/wergor), [KurdishTokenization](https://github.com/sinaahmadi/KurdishTokenization), [KurdishLID](https://github.com/sinaahmadi/KurdishLID), [Kurdspell](https://github.com/Kurdspell/Kurdspell), CKMorph, Apertium ckb | Various | Transliteration, tokenization, language identification, spell checking, morphology | Various | NLP area. Out of scope for KDT core. |
| [awesome-kurdish](https://github.com/sinaahmadi/awesome-kurdish) | List | Curated index of Kurdish resources | — | Lists no calendar or localization libraries, and no fonts. |
| [Unicode CLDR `ckb`](https://unicode.org/cldr/charts/44/delta/ckb.html) / ICU | Data | Locale data for Central Kurdish (`ckb`, `ckb-IR`) used by `Intl` | Unicode License | See section 2. |

## 2. What `Intl` already gives you (tested, not assumed)

Tested on Node 24.18 (ICU 78.3, CLDR 48.0) with full ICU:

```
Intl.DateTimeFormat('ckb', {dateStyle:'full', timeStyle:'short'})  →  ٢٠٢٦ ئازار ٢١, شەممە ٩:٠٥ ب.ن
months (ckb-IQ)   →  کانوونی دووەم … کانونی یەکەم
Intl.NumberFormat('ckb').format(-1234567.891) → ‏-١٬٢٣٤٬٥٦٧٫٨٩١
Intl.NumberFormat('ckb-IQ', {style:'currency', currency:'IQD'}) → ١٬٢٥٠٬٠٠٠ د.ع.‏
Intl.PluralRules('ckb') categories → one, other
```

What we found:

* The data exists, but its quality is uneven. December is spelled `کانونی یەکەم` while January is
  `کانوونی دووەم`, so the same word is written two ways. The full date pattern uses an ASCII comma and
  word order that Sorani writers would not normally use.
* Coverage depends on the runtime. Browsers, small-ICU Node builds, React Native/Hermes and PHP without
  `ext-intl` can return different results or fall back to English.
* `Intl` does not normalize text, compare Sorani alphabetically, parse Kurdish numerals, handle mixed
  RTL/LTR text or manage application translations.

Decision: KDT ships its own small, reviewed locale tables (month and weekday names, AM/PM, separators)
so output is identical on every runtime and in the future PHP port. KDT uses `Intl` only for
locale-independent work: rounding numbers with the `en` locale and reading date parts in a time zone.

## 3. Gaps KDT fills (application developer view)

| Need | Covered by an existing JS/PHP library? |
|---|---|
| Configurable, explainable Sorani text normalization for apps (opt-in, with a change report) | Partly (Kurdînûs is a web tool; AsoSoft is C#/Python) |
| Sorani alphabetical sorting, loose comparison, search keys | No |
| Text validation (detecting Arabic/Persian look-alike letters) | No |
| RTL/LTR detection, bidi isolation, splitting mixed text into direction runs, HTML `dir`/`lang` helpers | No Kurdish-specific library |
| Formatting and parsing Kurdish numerals (all three digit systems, Arabic separators) | Parsing: no. Formatting: `Intl` only, which varies by runtime |
| Deterministic Sorani Gregorian date formatting | Partly (`Intl`; tsroj is GPL) |
| IQD/USD price display with Sorani conventions | Partly (`Intl` IQD only) |
| Lightweight i18n with Sorani defaults (plurals, fallback, missing-key reports) and starter Sorani UI strings | No |
| PHP/Laravel versions that match the JS output exactly | No (kurdish-converter covers a different scope) |

## 4. Out of scope (use existing tools)

Tokenization, stemming, lemmatization, morphology, spell checking, transliteration and language
identification are handled by KLPT, KurdishHunspell, Wergor and the others listed above. KDT will
offer an optional adapter (`klpt-adapter`, a later phase) that calls a user-installed KLPT process or
service. It will never bundle KLPT code or data.
