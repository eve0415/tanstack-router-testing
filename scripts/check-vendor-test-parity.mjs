#!/usr/bin/env node

import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(new URL('..', import.meta.url).pathname);

const GROUPS = [
  {
    label: 'examples-react',
    vendor: 'vendor/examples/react',
    tests: 'packages/react-router-testing/tests/vendored/examples-react',
  },
  {
    label: 'e2e-react-router',
    vendor: 'vendor/e2e/react-router',
    tests: 'packages/react-router-testing/tests/vendored/e2e-react-router',
  },
  {
    label: 'e2e-react-start',
    vendor: 'vendor/e2e/react-start',
    tests: 'packages/react-router-testing/tests/vendored/e2e-react-start',
  },
];

const listDirs = dir =>
  readdirSync(join(REPO_ROOT, dir), { withFileTypes: true })
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
    .map(entry => entry.name)
    .sort();

const listTests = dir =>
  readdirSync(join(REPO_ROOT, dir), { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.test.ts'))
    .map(entry => entry.name.replace(/\.test\.ts$/, ''))
    .sort();

let failed = false;

for (const group of GROUPS) {
  if (!existsSync(join(REPO_ROOT, group.vendor)) || !existsSync(join(REPO_ROOT, group.tests))) {
    console.error(`[vendor-parity] missing group directories for ${group.label}`);
    failed = true;
    continue;
  }

  const vendor = listDirs(group.vendor);
  const tests = listTests(group.tests);
  const missing = vendor.filter(name => !tests.includes(name));
  const extra = tests.filter(name => !vendor.includes(name));

  if (missing.length > 0 || extra.length > 0) {
    failed = true;
    console.error(`[vendor-parity] ${group.label} drift detected`);
    if (missing.length > 0) console.error(`  missing tests: ${missing.join(', ')}`);
    if (extra.length > 0) console.error(`  extra tests: ${extra.join(', ')}`);
  } else {
    console.log(`[vendor-parity] ${group.label}: ${vendor.length} apps covered`);
  }
}

if (failed) process.exit(1);
