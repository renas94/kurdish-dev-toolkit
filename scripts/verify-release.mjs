#!/usr/bin/env node
// Pre-release checks for @kurdish-dev-toolkit/core. Run after `npm run build`.
//
//   node scripts/verify-release.mjs                 # checks the current package version
//   node scripts/verify-release.mjs core-v0.1.0     # also checks that the tag matches
//   node scripts/verify-release.mjs core-v0.1.0 --notes release-notes.md
//
// Checks: tag/version match, valid semver, a CHANGELOG section for the version, no runtime
// dependencies (or only MIT-compatible ones), LICENSE and README in the package, and a built file
// for every export. With --notes it writes that CHANGELOG section to a file for the GitHub release.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const pkgDir = join(root, 'packages', 'core');
const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
const args = process.argv.slice(2);
const notesIndex = args.indexOf('--notes');
const notesFile = notesIndex >= 0 ? args[notesIndex + 1] : undefined;
const positional = args.filter((a, i) => !a.startsWith('--') && !(notesIndex >= 0 && i === notesIndex + 1));
const tag = positional[0] ?? process.env.RELEASE_TAG;
if (notesIndex >= 0 && !notesFile) {
  console.error('--notes needs a file path');
  process.exit(1);
}

const errors = [];
const check = (ok, message) => { if (!ok) errors.push(message); };

// 1. Version and tag.
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
check(SEMVER.test(pkg.version), `package version "${pkg.version}" is not valid semver`);
if (tag !== undefined) {
  check(tag === `core-v${pkg.version}`, `tag "${tag}" does not match package version (expected "core-v${pkg.version}")`);
}

// 2. CHANGELOG section.
const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
const escaped = pkg.version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const section = changelog.match(new RegExp(`^## \\[${escaped}\\][^\\n]*\\n([\\s\\S]*?)(?=^## \\[|(?![\\s\\S]))`, 'm'));
check(section !== null && section[1].trim() !== '', `CHANGELOG.md has no non-empty "## [${pkg.version}]" section`);

// 3. Dependencies and licenses.
const ALLOWED_LICENSES = new Set(['MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', '0BSD']);
check(pkg.license === 'MIT', `package license must be MIT, found "${pkg.license}"`);
for (const dep of Object.keys(pkg.dependencies ?? {})) {
  const depPkgPath = join(root, 'node_modules', dep, 'package.json');
  const license = existsSync(depPkgPath) ? JSON.parse(readFileSync(depPkgPath, 'utf8')).license : undefined;
  check(ALLOWED_LICENSES.has(license), `runtime dependency ${dep} has license "${license}", which is not on the allow list`);
}
check(pkg.peerDependencies === undefined, 'core must not have peer dependencies');

// 4. Files that must ship.
check(existsSync(join(pkgDir, 'LICENSE')), 'packages/core/LICENSE is missing');
check(existsSync(join(pkgDir, 'README.md')), 'packages/core/README.md is missing');
for (const [subpath, target] of Object.entries(pkg.exports)) {
  const files = typeof target === 'string' ? [target] : Object.values(target);
  for (const file of files) {
    check(existsSync(join(pkgDir, file)), `export "${subpath}" points to missing file ${file} (did you run the build?)`);
  }
}

if (errors.length > 0) {
  console.error(`Release verification failed for ${pkg.name}@${pkg.version}:`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

if (notesFile) {
  writeFileSync(notesFile, section[1].trim() + '\n');
  console.log(`Wrote release notes to ${notesFile}`);
}
console.log(`Release verification passed for ${pkg.name}@${pkg.version}${tag ? ` (tag ${tag})` : ''}`);
