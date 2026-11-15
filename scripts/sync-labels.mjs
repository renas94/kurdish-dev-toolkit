#!/usr/bin/env node
// Creates or updates the repository's issue labels from .github/labels.json.
// Requires an authenticated GitHub CLI (`gh auth login`). Existing labels not in the file are kept.
//
// Usage: node scripts/sync-labels.mjs [owner/repo]
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const labels = JSON.parse(readFileSync(new URL('../.github/labels.json', import.meta.url), 'utf8'));
const repoArgs = process.argv[2] ? ['--repo', process.argv[2]] : [];

for (const { name, color, description } of labels) {
  execFileSync('gh', ['label', 'create', name, '--color', color, '--description', description, '--force', ...repoArgs], {
    stdio: 'inherit',
  });
  console.log(`✓ ${name}`);
}
