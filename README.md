# Kurdish Developer Toolkit (KDT)

[![CI](https://github.com/renas94/kurdish-dev-toolkit/actions/workflows/ci.yml/badge.svg)](https://github.com/renas94/kurdish-dev-toolkit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Making Kurdish Sorani development easier for everyone.**

KDT is an open-source toolkit for adding Kurdish Sorani (Central Kurdish, `ckb`) support to
applications: correct Unicode text handling, RTL layouts, numerals, dates, currency and
localization. It complements, and does not replace, linguistic toolkits such as
[KLPT](https://github.com/sinaahmadi/klpt).

> **Status:** early development (phases 1–2 of 6 done). Nothing has been published to npm or Packagist yet.

| Package | Status |
|---|---|
| [`@kurdish-dev-toolkit/core`](packages/core) (TypeScript) | 0.1.0-alpha.0, implemented and tested, ready to publish |
| PHP / Composer | planned (phase 3) |
| Laravel | planned (phase 4) |
| React | planned (phase 5) |
| Next.js | planned (phase 6) |

## Documentation

* [Research: existing Kurdish developer tools](docs/research/landscape-2026-11.md)
* [Architecture, API plan and roadmap](docs/architecture.md)
* [Core package README](packages/core/README.md)
* [Release process](docs/releasing.md)

## Tested environments

CI runs the full test suite on Linux, Windows and macOS with Node.js 20, 22 and 24, and in real
Chromium, Firefox and WebKit through Playwright. Before the GitHub repository and its CI exist, the
same suite was run locally on Windows with Node 20, 22 and 24 and in all three browser engines.

## Development

```sh
npm install
npm test          # Vitest
npm run typecheck
npm run build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full list of checks.

Test cases that are not tied to one language live in [`tests/fixtures`](tests/fixtures) and are shared
by every implementation.

## Contributing

Corrections to the Kurdish language data (month names, UI strings, normalization rules) are especially
welcome. See [CONTRIBUTING.md](CONTRIBUTING.md), the [Code of Conduct](CODE_OF_CONDUCT.md) and the
[security policy](SECURITY.md). New contributors can start with issues labelled `good first issue`.

## License

MIT. See [LICENSE](LICENSE).
