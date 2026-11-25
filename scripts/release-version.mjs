// Apache-2.0.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*))?$/;

export function releaseVersion(tag) {
  const { version } = read('../package.json');
  const match = versionPattern.exec(version);
  if (!match || match[4]?.split('.').some((part) => /^0\d+$/.test(part))) throw new Error(`Invalid root version: ${version}`);
  if (tag !== undefined && tag !== `v${version}`) throw new Error(`Tag ${tag} does not match v${version}`);
  const dirs = readdirSync(new URL('../packages/', import.meta.url), { withFileTypes: true }).filter((entry) => entry.isDirectory());
  if (dirs.length !== 7) throw new Error(`Expected 7 packages, got ${dirs.length}`);
  const names = new Set();
  for (const { name: dir } of dirs) {
    const pkg = read(`../packages/${dir}/package.json`);
    if (!pkg.name?.startsWith('@verared/') || names.has(pkg.name)) throw new Error(`Invalid release package: ${dir}`);
    if (pkg.version !== version) throw new Error(`${pkg.name} is ${pkg.version}, expected ${version}`);
    names.add(pkg.name);
  }
  return { version, prerelease: /^(?:alpha|beta|rc)(?:[.-]|$)/.test(match[4] ?? ''), packages: dirs.map(({ name }) => name).sort() };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error('Usage: node scripts/release-version.mjs <tag>');
  const { version, prerelease } = releaseVersion(process.argv[2]);
  console.log(`version=${version}\nprerelease=${prerelease}`);
}
