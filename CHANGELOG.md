# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added — `@kurdish-dev-toolkit/core` 0.1.0-alpha.0 (not published)

- `text`: explicit, configurable Sorani normalization with change reports; validation; a heuristic
  Sorani detector; Sorani alphabetical comparator; search keys.
- `rtl`: direction detection, RTL locale detection, bidi isolation, splitting mixed text into
  direction runs, HTML `dir` helpers.
- `numbers`: formatting and parsing for Western, Arabic-Indic and Persian digits.
- `dates`: Gregorian date and time formatting in Sorani, with explicit time zones.
- `currency`: IQD, USD, EUR, TRY and IRR display formatting, plus custom currencies.
- `i18n`: translator with interpolation, plurals and fallbacks, plus starter Sorani/English messages.
- Shared JSON test fixtures in `tests/fixtures`.
- `htmlDirAttributes` rejects `lang` values that are not language tags, so attribute values cannot
  be used for HTML injection.

### Infrastructure

- CI: Linux, Windows and macOS × Node 20/22/24; Chromium, Firefox and WebKit through Vitest browser
  mode; coverage thresholds; publint and are-the-types-wrong export checks; packed-tarball smoke
  test; TypeDoc with warnings treated as errors; `npm audit` of production dependencies.
- Release workflow for `core-v*` tags with pre-publish verification, npm provenance and GitHub
  releases.
- Contributing guide, code of conduct, security policy, issue and pull-request templates, label
  definitions and Dependabot.
