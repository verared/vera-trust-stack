import { readFileSync } from 'node:fs';
import { releaseVersion } from './release-version.mjs';

export const registry = 'https://registry.npmjs.org';

export function npmReleasePlan() {
  const { version, packages } = releaseVersion();
  const manifests = new Map(packages.map((dir) => {
    const manifest = JSON.parse(readFileSync(new URL(`../packages/${dir}/package.json`, import.meta.url), 'utf8'));
    return [manifest.name, manifest];
  }));
  const ordered = ['net', 'apw', 'local-trust', 'reputation', 'trust-layer', 'cloud-images', 'identity-atproto', 'cli'];
  const seen = new Set();
  const plan = ordered.map((shortName) => {
    const name = `@verared/${shortName}`;
    const manifest = manifests.get(name);
    if (!manifest) throw new Error(`Missing ${name}`);
    for (const deps of [manifest.dependencies, manifest.optionalDependencies, manifest.peerDependencies]) {
      for (const [dep, constraint] of Object.entries(deps ?? {})) {
        if (dep.startsWith('@verared/') && (!seen.has(dep) || constraint !== version)) {
          throw new Error(`${name}: ${dep}@${constraint} must be an earlier workspace package at ${version}`);
        }
      }
    }
    seen.add(name);
    return { name, version, filename: `verared-${shortName}-${version}.tgz`, exports: Object.keys(manifest.exports) };
  });
  return plan;
}
