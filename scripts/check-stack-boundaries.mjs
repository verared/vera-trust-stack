#!/usr/bin/env node
// Apache-2.0. Enforces package DAG, host neutrality, Web-API purity and the exact spec pin.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { isBuiltin } from 'node:module';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import ts from 'typescript';

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
    else if (/\.(?:[cm]?[jt]sx?|json|map)$/.test(e.name) && !/\.test\.[cm]?[jt]sx?$/.test(e.name)) out.push(full);
  }
  return out;
}

// 1. Root & package Apache-2.0 licenses + LICENSE files
const rootPkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
if (rootPkg.license !== 'Apache-2.0') fail(`Root package.json license must be Apache-2.0, got ${rootPkg.license}`);
if (!existsSync(resolve(root, 'LICENSE'))) fail('Missing root LICENSE file');

const adj = new Map([...EXPECTED_PACKAGES.keys()].map((d) => [d, new Set()]));
const forbiddenHost = /portaless|sqlite-driver|better-sqlite3/i;
const isNodeImport = (specifier) => specifier.startsWith('node:') || isBuiltin(specifier);

function importsIn(file, text) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const imports = [];
  function visit(node) {
    let specifier;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) specifier = node.moduleSpecifier;
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) specifier = node.argument.literal;
    if (ts.isExternalModuleReference(node)) specifier = node.expression;
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword
      || (ts.isIdentifier(node.expression) && ['require', '__require'].includes(node.expression.text)))) {
      specifier = node.arguments[0];
    }
    if (specifier && ts.isStringLiteralLike(specifier)) imports.push(specifier.text);
    ts.forEachChild(node, visit);
  }
  visit(source);
  return imports;
}

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

  if (forbiddenHost.test(readFileSync(pkgJsonPath, 'utf8'))) {
    fail(`Forbidden host reference in packages/${dir}/package.json`);
  }

  const files = walk(resolve(pkgDir, 'src'));
  for (const f of files) {
    const rel = relative(root, f).replaceAll('\\', '/');
    const text = readFileSync(f, 'utf8');
    if (forbiddenHost.test(text)) fail(`Forbidden host reference in ${rel}`);
    for (const spec of importsIn(f, text)) {
      if (spec.includes('/packages/') || /(?:\.\.\/)+[^/]+\/src\//.test(spec)) {
        fail(`Deep packages/*/src/ import in ${rel}: ${spec}`);
      }
      if (dir === 'net' && isNodeImport(spec)) {
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
  const distDir = resolve(pkgDir, 'dist');
  if (!existsSync(distDir)) fail(`Missing packages/${dir}/dist; run npm run build first`);
  else {
    for (const file of walk(distDir)) {
      if (forbiddenHost.test(readFileSync(file, 'utf8'))) {
        fail(`Forbidden host reference in ${relative(root, file)}`);
      }
    }
  }
}

// Check each deployable graph, resolving workspace references to sources for the source checks.
for (const rel of ['packages/net/src/index.ts', 'packages/apw-resolver/src/standalone.ts',
  'packages/net/dist/index.js', 'packages/apw-resolver/dist/standalone.js']) {
  try {
    const graph = await build({
      absWorkingDir: root, entryPoints: [rel], format: 'esm', bundle: true,
      platform: 'neutral', mainFields: ['module', 'main'], write: false,
      logLevel: 'silent', metafile: true,
      alias: rel.includes('/src/') ? { '@verared/net': './packages/net/src/index.ts' } : {},
      plugins: [{ name: 'check-node-imports', setup(builder) {
        builder.onResolve({ filter: /.*/ }, ({ path }) => isNodeImport(path) ? { path, external: true } : undefined);
      } }],
    });
    for (const file of Object.keys(graph.metafile.inputs)) {
      const path = resolve(root, file);
      for (const spec of importsIn(path, readFileSync(path, 'utf8'))) {
        if (isNodeImport(spec)) fail(`Forbidden Node import ${spec} in ${file} (reachable from ${rel})`);
      }
    }
  } catch (error) {
    fail(`Cannot check Web-API graph ${rel}: ${error.message}`);
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
  const expectedDigests = {
    schemaBundleDigest: '2-OWDPkYHe3A_DYyUbSsE5t1jFRyNxNM6DnVml-Tp7w',
    originalCorpusDigest: 'fbc9_xl0gKJlfH7JCslUsoOgHoQNrFuVRGdyPKEme0U',
    previousCorpusDigest: 'wpevxHbAUDyL5OVybTC2ANQ8ISby1hkCefwUgfSNeVg',
    corpusDigest: 'wNQ9gG2BPs8JO1wPsiPgoz265juDT-TCjuGMbTzSYXA',
    numericExtensionDigest: 'RLmrcBc3SjFN1Mephzw6y7h3N5_mzKN9oLxLRkTZH1g',
  };
  if (pin.commit !== '7787966a38fb08ceb509df295ee814ba93af4dec') fail('SPEC-PIN.json commit mismatch');
  if (pin.tarball?.sha256 !== 'a7f1580d3690a4cfe1b33b5267c8a98cc199dbd183579ab6b42c0f4418a18ef5') {
    fail('SPEC-PIN.json tarball SHA-256 mismatch');
  }
  if (Object.keys(pin.digests ?? {}).length !== Object.keys(expectedDigests).length) fail('SPEC-PIN.json digest set mismatch');
  for (const [key, expected] of Object.entries(expectedDigests)) {
    if (pin.digests?.[key] !== expected) fail(`SPEC-PIN.json ${key} mismatch`);
  }
}

if (failures.length > 0) {
  console.error(`[check-stack-boundaries] FAILED (${failures.length} issue(s)):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log('[check-stack-boundaries] OK — 7 Apache-2.0 packages, DAG, host neutrality, Web-API graphs, exact SPEC-PIN.');
