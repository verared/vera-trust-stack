#!/usr/bin/env node
// Apache-2.0. Packs all 7 @verared/* release tarballs + SHA256SUMS into a target directory outside the repo.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const outDir = resolve(process.argv[2] || '/tmp/verared-release-stack-v0.1.0-alpha.1');

mkdirSync(outDir, { recursive: true });
execFileSync(process.execPath, [resolve(root, 'scripts/build-packages.mjs')], { cwd: root, stdio: 'inherit' });

const dirs = ['net', 'apw-resolver', 'ltp-engine', 'ltp-reputation', 'trust-layer', 'cloud-images', 'identity-atproto'];
const sums = [];
for (const dir of dirs) {
  const pkgDir = resolve(root, 'packages', dir);
  const out = execFileSync(npmBin, ['pack', '--pack-destination', outDir, '--silent'], { cwd: pkgDir, encoding: 'utf8' });
  const filename = out
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .findLast((l) => l.endsWith('.tgz'));
  if (!filename) throw new Error(`Failed to determine packed tarball filename in ${dir}: ${out}`);
  const sha = createHash('sha256').update(readFileSync(join(outDir, filename))).digest('hex');
  sums.push(`${sha}  ${filename}`);
}
writeFileSync(join(outDir, 'SHA256SUMS'), sums.join('\n') + '\n', 'utf8');
console.log(`[pack-release] Packed 7 tarballs + SHA256SUMS into ${outDir}`);
console.log(sums.join('\n'));
