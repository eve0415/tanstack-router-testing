#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(import.meta.url), '../..');
const arg = process.argv[2];

if (!arg) {
  console.error('Usage: bump-version.ts <major|minor|patch|x.y.z>');
  process.exit(1);
}

function resolveVersion(input: string): string {
  if (/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(input)) return input;

  const bumpTypes = ['major', 'minor', 'patch'] as const;
  type BumpType = (typeof bumpTypes)[number];
  if (!bumpTypes.includes(input as BumpType)) {
    console.error(`Invalid version or bump type: ${input}`);
    process.exit(1);
  }

  const currentPkg = JSON.parse(readFileSync(resolve(root, 'packages/router-testing-core/package.json'), 'utf-8'));
  const parts = (currentPkg.version as string).split('.').map(Number);
  const idx = bumpTypes.indexOf(input as BumpType);
  parts[idx]!++;
  for (let i = idx + 1; i < parts.length; i++) parts[i] = 0;
  return parts.join('.');
}

const version = resolveVersion(arg);

const packages = ['packages/router-testing-core', 'packages/react-router-testing', 'packages/react-start-testing', 'packages/react-start-testing-storybook'];

for (const pkg of packages) {
  const pkgJsonPath = resolve(root, pkg, 'package.json');
  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
  pkgJson.version = version;
  writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n');
  console.log(`Updated ${pkg}/package.json → ${version}`);
}

const commit = process.argv.includes('--commit');
if (commit) {
  execSync('git add packages/*/package.json', { cwd: root, stdio: 'inherit' });
  execSync(`git commit -m "release: v${version}"`, { cwd: root, stdio: 'inherit' });
  execSync(`git tag v${version}`, { cwd: root, stdio: 'inherit' });
  console.log(`\nCommitted and tagged v${version}`);
  console.log(`Push with: git push && git push origin v${version}`);
} else {
  console.log(`\nVersion updated. To commit and tag:\n  git add packages/*/package.json && git commit -m "release: v${version}" && git tag v${version}`);
}
