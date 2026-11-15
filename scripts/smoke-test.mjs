#!/usr/bin/env node
// Installs the packed tarball of @kurdish-dev-toolkit/core into a throwaway project and checks that
// it works the way users will consume it: every subpath import, deep imports blocked, and strict
// TypeScript type-checking against the shipped declarations.
//
// Usage: npm run build && node scripts/smoke-test.mjs
import { execFileSync, execSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const pkgDir = join(root, 'packages', 'core');
const tsc = join(root, 'node_modules', 'typescript', 'bin', 'tsc');
const work = mkdtempSync(join(tmpdir(), 'kdt-smoke-'));
const isWin = process.platform === 'win32';

function run(cmd, args, cwd, { quiet = false } = {}) {
  const options = { cwd, stdio: ['ignore', 'pipe', quiet ? 'pipe' : 'inherit'], encoding: 'utf8' };
  // npm is a .cmd shim on Windows and can only be started through a shell; quote each argument.
  if (isWin && cmd === 'npm') return execSync([cmd, ...args.map((a) => `"${a}"`)].join(' '), options);
  return execFileSync(cmd, args, options);
}

try {
  run('npm', ['pack', '--silent', '--pack-destination', work], pkgDir, { quiet: true });
  const tarball = readdirSync(work).find((f) => f.endsWith('.tgz'));
  if (!tarball) throw new Error('npm pack produced no tarball');

  writeFileSync(join(work, 'package.json'), JSON.stringify({ name: 'kdt-smoke', private: true, type: 'module' }));
  run('npm', ['install', '--no-audit', '--no-fund', '--silent', `./${tarball}`], work);

  writeFileSync(join(work, 'smoke.mjs'), `
import assert from 'node:assert/strict';
import * as root from '@kurdish-dev-toolkit/core';
import { normalize } from '@kurdish-dev-toolkit/core/text';
import { getDirection } from '@kurdish-dev-toolkit/core/rtl';
import { formatNumber, parseNumber } from '@kurdish-dev-toolkit/core/numbers';
import { formatDate } from '@kurdish-dev-toolkit/core/dates';
import { formatCurrency } from '@kurdish-dev-toolkit/core/currency';
import { createTranslator, soraniMessages } from '@kurdish-dev-toolkit/core/i18n';

assert.equal(normalize('كوردي'), 'کوردی');
assert.equal(getDirection('سڵاو Hi'), 'rtl');
assert.equal(formatNumber(1234.5), '١٬٢٣٤٫٥');
assert.equal(parseNumber('١٬٢٣٤٫٥'), 1234.5);
assert.equal(formatDate('2026-03-21T09:00:00Z', { timeZone: 'Asia/Baghdad', format: 'full' }), 'شەممە، ٢١ی ئازاری ٢٠٢٦');
assert.equal(formatCurrency(1250000), '١٬٢٥٠٬٠٠٠\\u00A0د.ع');
assert.equal(createTranslator({ locale: 'ckb', messages: { ckb: soraniMessages } })('messages.count', { count: 3 }), '٣ پەیام');
assert.equal(root.formatNumber, formatNumber, 'root and subpath exports must be the same function');
await assert.rejects(import('@kurdish-dev-toolkit/core/dist/text/normalize.js'), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });
console.log('runtime smoke test passed (' + Object.keys(root).length + ' root exports)');
`);
  process.stdout.write(run('node', ['smoke.mjs'], work));

  writeFileSync(join(work, 'consumer.ts'), `
import { formatNumber, KdtError, type FormatNumberOptions } from '@kurdish-dev-toolkit/core';
import { normalize, type NormalizeOptions } from '@kurdish-dev-toolkit/core/text';
import type { Translator } from '@kurdish-dev-toolkit/core/i18n';
const o: FormatNumberOptions = { numerals: 'latn' };
const n: NormalizeOptions = { h: 'heh' };
const s: string = formatNumber(1, o) + normalize('x', n);
export const e = new KdtError('PARSE_ERROR', s);
export type T = Translator;
// @ts-expect-error an unknown numeral system must be a type error
formatNumber(1, { numerals: 'roman' });
`);
  run('node', [tsc, '--strict', '--module', 'nodenext', '--moduleResolution', 'nodenext', '--target', 'es2022', '--noEmit', 'consumer.ts'], work);
  console.log('TypeScript consumer smoke test passed');
} finally {
  rmSync(work, { recursive: true, force: true });
}
