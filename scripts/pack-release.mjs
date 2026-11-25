#!/usr/bin/env node
// Apache-2.0. Packs all 7 @verared/* release tarballs + SHA256SUMS into a target directory outside the repo.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { releaseVersion } from './release-version.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const { version, packages } = releaseVersion();
const outDir = process.argv[2] ? resolve(process.argv[2]) : mkdtempSync(join(tmpdir(), `verared-release-stack-v${version}-`));

mkdirSync(outDir, { recursive: true });
if (readdirSync(outDir).length) throw new Error(`Release output must be empty: ${outDir}`);
execFileSync(process.execPath, [resolve(root, 'scripts/build-packages.mjs')], { cwd: root, stdio: 'inherit' });

const sums = [];
for (const dir of packages) {
  const pkgDir = resolve(root, 'packages', dir);
  const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
  const packed = JSON.parse(execFileSync(npmBin, ['pack', '--pack-destination', outDir, '--json'], { cwd: pkgDir, encoding: 'utf8' }));
  const filename = `${pkg.name.replace(/^@/, '').replace('/', '-')}-${version}.tgz`;
  if (packed.length !== 1 || packed[0].filename !== filename) throw new Error(`Unexpected tarball for ${pkg.name}: ${JSON.stringify(packed)}`);
  const sha = createHash('sha256').update(readFileSync(join(outDir, filename))).digest('hex');
  sums.push(`${sha}  ${filename}`);
}
writeFileSync(join(outDir, 'SHA256SUMS'), sums.join('\n') + '\n', 'utf8');
console.log(`[pack-release] Packed 7 tarballs + SHA256SUMS into ${outDir}`);
console.log(sums.join('\n'));
