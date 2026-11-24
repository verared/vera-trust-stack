#!/usr/bin/env node
// Apache-2.0. Enforces Vera Trust Stack boundaries: licenses, DAG, zero deep src/, zero Portaless refs, Web-API purity.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const failures = [];
const fail = (msg) => failures.push(msg);

const EXPECTED_PACKAGES = new Map([
  ['net', { name: '@verared/net', layer: 0 }],
  ['apw-resolver', { name: '@verared/apw', layer: 1 }],
  ['ltp-engine', { name: '@verared/local-trust', layer: 1 }],
  ['ltp-reputation', { name: '@verared/reputation', layer: 1 }],
  ['trust-layer', { name: '@verared/trust-layer', layer: 2 }],
  ['cloud-images', { name: '@verared/cloud-images', layer: 2 }],
  ['identity-atproto', { name: '@verared/identity-atproto', layer: 2 }],
]);

const NAME_TO_DIR = new Map([...EXPECTED_PACKAGES.entries()].map(([dir, m]) => [m.name, dir]));

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git', '__tests__'].includes(e.name)) continue;
    const full = resolve(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(ts|mts|js|mjs)$/.test(e.name) && !e.name.endsWith('.test.ts')) out.push(full);
  }
  return out;
}

// 1. Root & package Apache-2.0 licenses + LICENSE files
const rootPkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
if (rootPkg.license !== 'Apache-2.0') fail(`Root package.json license must be Apache-2.0, got ${rootPkg.license}`);
if (!existsSync(resolve(root, 'LICENSE'))) fail('Missing root LICENSE file');

const adj = new Map([...EXPECTED_PACKAGES.keys()].map((d) => [d, new Set()]));
const importRe = /(?:from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|require\s*\(\s*['"]([^'"]+)['"]\s*\))/g;

for (const [dir, meta] of EXPECTED_PACKAGES) {
  const pkgDir = resolve(root, 'packages', dir);
  const pkgJsonPath = resolve(pkgDir, 'package.json');
  const licPath = resolve(pkgDir, 'LICENSE');
  if (!existsSync(pkgJsonPath)) {
    fail(`Missing packages/${dir}/package.json`);
    continue;
  }
  if (!existsSync(licPath)) fail(`Missing packages/${dir}/LICENSE`);
  const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
  if (pkg.name !== meta.name) fail(`packages/${dir}/package.json name must be ${meta.name}, got ${pkg.name}`);
  if (pkg.license !== 'Apache-2.0') fail(`packages/${dir}/package.json license must be Apache-2.0, got ${pkg.license}`);

  for (const dep of Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies })) {
    if (dep.startsWith('@portaless/') || dep === 'better-sqlite3' || dep === 'sqlite-driver') {
      fail(`Forbidden dependency ${dep} in packages/${dir}/package.json`);
    }
  }

  const files = walk(resolve(pkgDir, 'src'));
  for (const f of files) {
    const rel = relative(root, f).replaceAll('\\', '/');
    const text = readFileSync(f, 'utf8');
    if (/@portaless\/|geroiloyola\/portaless|sqlite-driver|better-sqlite3/.test(text)) {
      fail(`Forbidden Portaless/SQLite reference in ${rel}`);
    }
    for (const m of text.matchAll(importRe)) {
      const spec = m[1] || m[2] || m[3] || '';
      if (!spec) continue;
      if (spec.includes('/packages/') || /(?:\.\.\/)+[^/]+\/src\//.test(spec)) {
        fail(`Deep packages/*/src/ import in ${rel}: ${spec}`);
      }
      if (dir === 'net' && spec.startsWith('node:')) {
        fail(`Forbidden node:* import in Web-API pure @verared/net (${rel}): ${spec}`);
      }
      const pkgBase = spec.startsWith('@verared/') ? spec.split('/').slice(0, 2).join('/') : null;
      if (pkgBase && NAME_TO_DIR.has(pkgBase)) {
        const targetDir = NAME_TO_DIR.get(pkgBase);
        const targetLayer = EXPECTED_PACKAGES.get(targetDir).layer;
        if (targetLayer > meta.layer) {
          fail(`Upward layer violation in ${rel}: ${meta.name} (L${meta.layer}) -> ${pkgBase} (L${targetLayer})`);
        }
        if (targetDir !== dir) adj.get(dir).add(targetDir);
      }
    }
  }
}

// 2. Check Web-API purity on compiled dist/standalone.js & net/dist/index.js if present
for (const rel of ['packages/net/dist/index.js', 'packages/apw-resolver/dist/standalone.js']) {
  const full = resolve(root, rel);
  if (existsSync(full)) {
    const text = readFileSync(full, 'utf8');
    if (/(?:from|import)\s*['"]node:/.test(text)) {
      fail(`Forbidden node:* import in built artifact ${rel}`);
    }
  }
}

// 3. Cycle detection (DFS)
const state = new Map();
function dfs(node, stack) {
  state.set(node, 1);
  for (const next of adj.get(node) || []) {
    if (state.get(next) === 1) {
      fail(`Dependency cycle detected: ${[...stack, next].join(' -> ')}`);
    } else if (!state.get(next)) {
      dfs(next, [...stack, next]);
    }
  }
  state.set(node, 2);
}
for (const node of adj.keys()) {
  if (!state.get(node)) dfs(node, [node]);
}

// 4. Verify SPEC-PIN.json
const pinPath = resolve(root, 'SPEC-PIN.json');
if (!existsSync(pinPath)) {
  fail('Missing SPEC-PIN.json');
} else {
  const pin = JSON.parse(readFileSync(pinPath, 'utf8'));
  if (pin.digests?.corpusDigest !== 'wNQ9gG2BPs8JO1wPsiPgoz265juDT-TCjuGMbTzSYXA') {
    fail('SPEC-PIN.json corpusDigest mismatch');
  }
  if (!/^[a-f0-9]{40}$/.test(pin.commit || '')) {
    fail('SPEC-PIN.json commit must be a 40-char SHA');
  }
}

if (failures.length > 0) {
  console.error(`[check-stack-boundaries] FAILED (${failures.length} issue(s)):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log('[check-stack-boundaries] OK — 7 Apache-2.0 packages, 0 cycles, 0 deep src/ imports, 0 Portaless/SQLite refs, SPEC-PIN verified.');
