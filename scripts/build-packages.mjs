#!/usr/bin/env node
// Apache-2.0. Compiles all 7 @verared/* packages to dist/ (ESM .js + .d.ts) in topological order.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const tscBin = resolve(root, 'node_modules/typescript/bin/tsc');
const esbuildBin = resolve(root, 'node_modules/esbuild/bin/esbuild');

const PACKAGES = [
  {
    dir: 'net',
    name: '@verared/net',
    platform: 'neutral',
    entries: [['src/index.ts', 'dist/index.js']],
    forbidNodeBuiltins: ['dist/index.js'],
  },
  {
    dir: 'apw-resolver',
    name: '@verared/apw',
    platform: 'neutral',
    entries: [
      ['src/standalone.ts', 'dist/standalone.js'],
      ['src/index.ts', 'dist/index.js'],
      ['src/did-apw/index.ts', 'dist/did-apw/index.js'],
      ['src/scoring/index.ts', 'dist/scoring/index.js'],
      ['src/federation/index.ts', 'dist/federation/index.js'],
    ],
    forbidNodeBuiltins: ['dist/standalone.js'],
  },
  {
    dir: 'ltp-engine',
    name: '@verared/local-trust',
    platform: 'node',
    entries: [['src/index.ts', 'dist/index.js']],
    forbidNodeBuiltins: [],
  },
  {
    dir: 'ltp-reputation',
    name: '@verared/reputation',
    platform: 'neutral',
    entries: [['src/index.ts', 'dist/index.js']],
    forbidNodeBuiltins: [],
  },
  {
    dir: 'trust-layer',
    name: '@verared/trust-layer',
    platform: 'neutral',
    entries: [
      ['src/index.ts', 'dist/index.js'],
      ['src/site-trust/index.ts', 'dist/site-trust/index.js'],
      ['src/policy/index.ts', 'dist/policy/index.js'],
      ['src/billing/index.ts', 'dist/billing/index.js'],
      ['src/ledger/index.ts', 'dist/ledger/index.js'],
      ['src/net/index.ts', 'dist/net/index.js'],
    ],
    forbidNodeBuiltins: [],
  },
  {
    dir: 'cloud-images',
    name: '@verared/cloud-images',
    platform: 'neutral',
    entries: [['src/index.ts', 'dist/index.js']],
    forbidNodeBuiltins: [],
  },
  {
    dir: 'identity-atproto',
    name: '@verared/identity-atproto',
    platform: 'neutral',
    entries: [['src/index.ts', 'dist/index.js']],
    forbidNodeBuiltins: [],
  },
];

for (const pkg of PACKAGES) {
  const pkgDir = resolve(root, 'packages', pkg.dir);
  const distDir = resolve(pkgDir, 'dist');
  rmSync(distDir, { recursive: true, force: true });
  mkdirSync(distDir, { recursive: true });

  // 1. Emit .d.ts declarations via tsc
  execFileSync(process.execPath, [tscBin, '-p', 'tsconfig.build.json', '--emitDeclarationOnly'], {
    cwd: pkgDir,
    stdio: 'inherit',
  });

  // 2. Bundle each public entry point to ESM .js with external packages
  for (const [srcRel, outRel] of pkg.entries) {
    const outFull = resolve(pkgDir, outRel);
    mkdirSync(dirname(outFull), { recursive: true });
    execFileSync(
      esbuildBin,
      [
        resolve(pkgDir, srcRel),
        '--bundle',
        '--format=esm',
        `--platform=${pkg.platform}`,
        '--packages=external',
        `--outfile=${outFull}`,
      ],
      { cwd: pkgDir, stdio: 'inherit' },
    );

    const dtsPath = outFull.replace(/\.js$/, '.d.ts');
    if (!existsSync(dtsPath)) {
      throw new Error(`Missing declaration file ${dtsPath} for ${pkg.name}`);
    }
  }

  // 3. Enforce 0 node:* imports in Web-API pure entry points
  for (const checkRel of pkg.forbidNodeBuiltins) {
    const content = readFileSync(resolve(pkgDir, checkRel), 'utf8');
    if (/(?:from|import)\s*['"]node:/.test(content) || /require\(['"]node:/.test(content)) {
      throw new Error(`Forbidden node:* import detected in Web-API pure artifact ${pkg.dir}/${checkRel}`);
    }
  }

  console.log(`[build-packages] OK ${pkg.name} (${pkg.entries.length} entrypoint(s))`);
}

console.log('[build-packages] All 7 @verared/* packages compiled to dist/ cleanly.');
