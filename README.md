# Kurdish Developer Toolkit (KDT)

**Making Kurdish Sorani development easier for everyone.**

KDT is an open-source toolkit for adding Kurdish Sorani (Central Kurdish, `ckb`) support to
applications: correct Unicode text handling, RTL layouts, numerals, dates, currency and
localization. It complements, and does not replace, linguistic toolkits such as
[KLPT](https://github.com/sinaahmadi/klpt).

> **Status:** early development (phase 1 of 6). Nothing has been published to npm or Packagist yet.

| Package | Status |
|---|---|
| [`@kurdish-dev-toolkit/core`](packages/core) (TypeScript) | 0.1.0-alpha.0, implemented and tested |
| PHP / Composer | planned (phase 3) |
| Laravel | planned (phase 4) |
| React | planned (phase 5) |
| Next.js | planned (phase 6) |

## Documentation

* [Research: existing Kurdish developer tools](docs/research/landscape-2026-11.md)
* [Architecture, API plan and roadmap](docs/architecture.md)
* [Core package README](packages/core/README.md)

## Development

```sh
npm install
npm test          # Vitest
npm run typecheck
npm run build
```

Test cases that are not tied to one language live in [`tests/fixtures`](tests/fixtures) and are shared
by every implementation.

## Contributing

Corrections to the Kurdish language data (month names, UI strings, normalization rules) are especially
welcome. Please open an issue that includes a source or explains the usage.

## License

MIT. See [LICENSE](LICENSE).
