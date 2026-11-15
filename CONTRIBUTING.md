# Contributing to KDT

Thank you for helping make Kurdish Sorani easier to support in software. Contributions of every size
are welcome: Kurdish language corrections, Unicode fixes, tests, documentation, new utilities and
framework integrations.

By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

| You want to… | Start here |
|---|---|
| Fix a Kurdish word, month name, UI string or normalization rule | Open a **Kurdish language correction** issue, or send a PR directly |
| Report a bug | Open a **Bug report** issue with a minimal example |
| Suggest a feature | Open a **Feature request** issue. Explain the real-world problem first |
| Find a first task | Look for issues labelled [`good first issue`](../../labels/good%20first%20issue) |
| Report a security problem | Do **not** open an issue. See [SECURITY.md](SECURITY.md) |

## Kurdish language contributions

The language data is the most valuable part of this project, and the part that most needs review
from native speakers. When you propose a change:

* Explain the usage: where the spelling or term is used (region, publications, institutions).
  Link to sources where possible.
* If a form is standard in one region but not in another, say so. KDT can offer options instead of
  picking a single "correct" form.
* Use standard Unicode code points (ی U+06CC, ک U+06A9, ە U+06D5, ڕ U+0695, ڵ U+06B5). In issues and
  code comments, write invisible characters as escapes (`‌`).

Language data lives in:

* `packages/core/src/dates/index.ts`: month, weekday and AM/PM names
* `packages/core/src/i18n/messages.ts`: starter UI strings
* `packages/core/src/currency/index.ts`: currency names and symbols
* `packages/core/src/text/`: alphabet, normalization and validation rules

## Development setup

Requirements: Node.js 20 or newer, and npm.

```sh
git clone https://github.com/renas94/kurdish-dev-toolkit.git
cd kurdish-dev-toolkit
npm install
npm test               # unit tests (Vitest)
npm run typecheck      # strict TypeScript
npm run build
```

Optional checks (CI runs all of these):

```sh
npm run test:coverage                      # coverage thresholds: 95% lines, 90% branches
npx playwright install chromium            # once
npm run test:browser                       # the same tests in a real browser (BROWSER=firefox|webkit)
npm run lint:package                       # publint + are-the-types-wrong
npm run smoke                              # install the packed tarball and import it
```

## Pull request checklist

* **Tests**: every public function needs tests. Use real Sorani text. If a behaviour must match in
  PHP later, add the case to `tests/fixtures/*.json` instead of a JS-only test.
* **No implicit changes to input**: functions must not normalize, convert calendars or change
  digits unless the caller asks.
* **No new runtime dependencies** in `@kurdish-dev-toolkit/core` without discussing it in an issue
  first.
* **Docs**: update the package README and the TSDoc comments (with an `@example`) for API changes.
* **Changelog**: add a line under `## [Unreleased]` in `CHANGELOG.md`.
* **Licensing**: do not copy code or data from other projects unless the license is compatible with
  MIT, and say where it came from. KLPT (CC BY-SA 4.0) and tsroj (GPL-3.0) must not be copied.

Keep pull requests focused: one change per PR is easier to review.

## Commit messages

Write a short summary line in the imperative mood ("Add Persian digit parsing"), followed by a
blank line and, if needed, an explanation of *why*.

## Versioning

KDT follows [Semantic Versioning](https://semver.org/). Until 1.0.0, minor versions may contain
breaking changes, and these are always listed in the changelog. Maintainers handle releases; see
[docs/releasing.md](docs/releasing.md).
