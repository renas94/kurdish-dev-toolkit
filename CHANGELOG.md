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
