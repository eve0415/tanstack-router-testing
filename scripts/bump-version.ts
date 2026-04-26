import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(import.meta.url), '../..');
const version = process.argv[2];

if (!version) {
  console.error('Usage: node scripts/bump-version.ts <version>');
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version)) {
  console.error(`Invalid version: ${version}`);
  process.exit(1);
}

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
