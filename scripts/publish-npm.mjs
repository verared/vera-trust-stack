import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { npmReleasePlan, registry } from './npm-release-plan.mjs';

const [mode, input, ...extra] = process.argv.slice(2);
const dryRun = mode === '--dry-run' && input === undefined;
if (!dryRun && !(mode === '--assets' && input && extra.length === 0)) {
  throw new Error('Usage: node scripts/publish-npm.mjs --dry-run | --assets <verified-tarball-directory>');
}
if (!dryRun && (process.env.GITHUB_ACTIONS !== 'true' || !process.env.NODE_AUTH_TOKEN)) {
  throw new Error('Publication requires GitHub Actions and NODE_AUTH_TOKEN');
}

const plan = npmReleasePlan();
const root = fileURLToPath(new URL('../', import.meta.url));
const dir = dryRun ? mkdtempSync(join(tmpdir(), 'verared-npm-dry-run-')) : resolve(input);

try {
  if (dryRun) execFileSync(process.execPath, ['scripts/pack-release.mjs', dir], { cwd: root, stdio: 'inherit' });
  const manifest = readFileSync(join(dir, 'SHA256SUMS'), 'utf8').trim().split('\n');
  if (manifest.length !== plan.length) throw new Error('Unexpected number of release checksums');
  for (const { filename } of plan) {
    const digest = createHash('sha256').update(readFileSync(join(dir, filename))).digest('hex');
    if (!manifest.includes(`${digest}  ${filename}`)) throw new Error(`Invalid release checksum: ${filename}`);
  }

  for (const { name, version, filename } of plan) {
    const tag = version.includes('-') ? 'next' : 'latest';
    if (dryRun) {
      console.log(`[dry-run] ${name}@${version} ← ${filename} (public, provenance, dist-tag ${tag})`);
      continue;
    }
    const response = await fetch(`${registry}/${encodeURIComponent(name)}/${encodeURIComponent(version)}`, {
      redirect: 'error', signal: AbortSignal.timeout(20_000), headers: { 'Cache-Control': 'no-cache' },
    });
    if (response.ok) {
      const existing = await response.json();
      if (existing.name !== name || existing.version !== version) throw new Error(`Unexpected registry metadata for ${name}@${version}`);
      console.log(`[skip] ${name}@${version} already exists`);
      continue;
    }
    if (response.status !== 404) throw new Error(`Cannot check ${name}@${version}: registry returned ${response.status}`);
    execFileSync('npm', ['publish', join(dir, filename), '--registry', registry, '--access', 'public', '--provenance', '--tag', tag], {
      stdio: 'inherit',
    });
  }
} finally {
  if (dryRun) rmSync(dir, { recursive: true, force: true });
}
