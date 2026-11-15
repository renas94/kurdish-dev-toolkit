# Releasing `@kurdish-dev-toolkit/core`

Releases are published by GitHub Actions (`.github/workflows/release.yml`) when a tag named
`core-v<version>` is pushed. Nothing is published from a developer machine.

## One-time setup (maintainers)

1. **npm scope**: create the npm organization `kurdish-dev-toolkit` (or change the package name
   before the first release). The scope was not checked for availability while the project was
   being set up.
2. **Publishing credentials**: either configure npm *trusted publishing* for this repository and
   `release.yml`, or create an npm automation token and save it as the repository secret
   `NPM_TOKEN`.
3. **Approval gate (recommended)**: create a GitHub environment named `npm` with required reviewers,
   so every publish needs a manual approval.
4. **Labels**: `node scripts/sync-labels.mjs` (requires an authenticated `gh` CLI).
5. **Security reports**: enable *Private vulnerability reporting* under Settings → Security.

## Release steps

1. Make sure `main` is green in CI.
2. Pick the version ([semver](https://semver.org/); before 1.0.0, breaking changes bump the minor
   version). Pre-releases use `-alpha.N`, `-beta.N` or `-rc.N` and are published under the npm
   `next` dist-tag.
3. Update `packages/core/package.json` → `version`.
4. In `CHANGELOG.md`, rename the `## [Unreleased]` section to `## [<version>] - YYYY-MM-DD`, then add a
   new empty `## [Unreleased]` section above it. Write the notes for users: what changed, what
   breaks, and how to migrate.
5. Run the checks locally:

   ```sh
   npm ci
   npm run typecheck && npm run test:coverage && npm run build
   npm run lint:package && npm run smoke
   node scripts/verify-release.mjs core-v<version>
   ```

6. Commit with the message `Release core v<version>`, then tag and push:

   ```sh
   git tag core-v<version>
   git push origin main core-v<version>
   ```

7. The workflow runs the full CI matrix (Linux, Windows and macOS on Node 20/22/24, and Chromium,
   Firefox and WebKit), checks the tag and changelog again, publishes to npm with provenance, and
   creates a GitHub release using the changelog section as release notes.

## What `verify-release.mjs` checks

* the tag matches `core-v` + the package version, and the version is valid semver
* `CHANGELOG.md` has a non-empty section for the version
* the package license is MIT, there are no peer dependencies, and every runtime dependency uses an
  allow-listed license (currently there are none)
* `LICENSE` and `README.md` are in the package, and every `exports` target was built

## If something goes wrong

* **The workflow failed before publishing**: fix the problem, delete the tag
  (`git push --delete origin core-v<version>`), and tag again.
* **A broken version was published**: never unpublish. Run
  `npm deprecate @kurdish-dev-toolkit/core@<version> "<reason>"` and release a patch.
