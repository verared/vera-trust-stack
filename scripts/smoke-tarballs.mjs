#!/usr/bin/env node
// Apache-2.0. Packs all 7 @verared/* tarballs and verifies external consumer installation & ESM imports
// without querying registry.npmjs.org for any @verared/* package.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const checkTypes = process.argv.includes('--types');

const PACKAGE_DIRS = [
  'net',
  'apw-resolver',
  'ltp-engine',
  'ltp-reputation',
  'trust-layer',
  'cloud-images',
  'identity-atproto',
];

// Ensure dist/ is built
execFileSync(process.execPath, [resolve(root, 'scripts/build-packages.mjs')], { cwd: root, stdio: 'inherit' });

const workDir = mkdtempSync(join(tmpdir(), 'verared-tarball-smoke-'));
const tarballsDir = join(workDir, 'tarballs');
const consumerDir = join(workDir, 'consumer');
mkdirSync(tarballsDir, { recursive: true });
mkdirSync(consumerDir, { recursive: true });

try {
  const tarballs = {};
  for (const dir of PACKAGE_DIRS) {
    const pkgDir = resolve(root, 'packages', dir);
    const pkg = JSON.parse(readFileSync(resolve(pkgDir, 'package.json'), 'utf8'));
    const out = execFileSync(npmBin, ['pack', '--pack-destination', tarballsDir, '--silent'], {
      cwd: pkgDir,
      encoding: 'utf8',
    });
    const filename = out
      .trim()
      .split(/\r?\n/)
      .map((l) => l.trim())
      .findLast((l) => l.endsWith('.tgz'));
    if (!filename) throw new Error(`Failed to determine packed tarball filename for ${pkg.name}: ${out}`);
    tarballs[pkg.name] = `file:${join(tarballsDir, filename)}`;
  }

  // Pin every workspace dependency to the exact tarball in the consumer.
  const consumerPkg = {
    name: 'verared-tarball-consumer-smoke',
    private: true,
    type: 'module',
    dependencies: { ...tarballs },
    overrides: { ...tarballs },
  };
  writeFileSync(join(consumerDir, 'package.json'), JSON.stringify(consumerPkg, null, 2) + '\n', 'utf8');

  // Install consumer using local tarballs for all @verared/* packages
  execFileSync(npmBin, ['install', '--no-audit', '--no-fund', '--prefer-offline'], {
    cwd: consumerDir,
    stdio: 'inherit',
  });

  // Verify package-lock.json resolved every @verared/* package from local tarball (never registry.npmjs.org)
  const lock = JSON.parse(readFileSync(join(consumerDir, 'package-lock.json'), 'utf8'));
  for (const [pkgKey, meta] of Object.entries(lock.packages || {})) {
    if (pkgKey.includes('@verared/')) {
      const resolved = String(meta.resolved || '');
      if (resolved.includes('registry.npmjs.org')) {
        throw new Error(`@verared package ${pkgKey} resolved from npm registry instead of tarball: ${resolved}`);
      }
      if (!resolved.startsWith('file:')) {
        throw new Error(`@verared package ${pkgKey} did not resolve from tarball: ${resolved}`);
      }
    }
  }

  // Smoke-import all 17 public entrypoints in pure Node ESM (no TypeScript stripping)
  const smokeScript = `
    import * as net from '@verared/net';
    import * as apw from '@verared/apw';
    import * as apwFull from '@verared/apw/full';
    import * as apwResolver from '@verared/apw/resolver';
    import * as apwDid from '@verared/apw/did-apw';
    import * as apwScoring from '@verared/apw/scoring';
    import * as apwFed from '@verared/apw/federation';
    import * as localTrust from '@verared/local-trust';
    import * as reputation from '@verared/reputation';
    import * as trustLayer from '@verared/trust-layer';
    import * as tlSiteTrust from '@verared/trust-layer/site-trust';
    import * as tlPolicy from '@verared/trust-layer/policy';
    import * as tlBilling from '@verared/trust-layer/billing';
    import * as tlLedger from '@verared/trust-layer/ledger';
    import * as tlNet from '@verared/trust-layer/net';
    import * as cloudImages from '@verared/cloud-images';
    import * as identityAtproto from '@verared/identity-atproto';

    const mods = {
      net, apw, apwFull, apwResolver, apwDid, apwScoring, apwFed,
      localTrust, reputation, trustLayer, tlSiteTrust, tlPolicy,
      tlBilling, tlLedger, tlNet, cloudImages, identityAtproto,
    };
    for (const [k, m] of Object.entries(mods)) {
      if (!m || Object.keys(m).length === 0) {
        throw new Error('Empty module exports for ' + k);
      }
    }
    if (typeof net.OperationBudget !== 'function') throw new Error('Missing net.OperationBudget');
    if (typeof apw.APW_TXT_PREFIX !== 'string') throw new Error('Missing apw.APW_TXT_PREFIX');
    if (typeof reputation.classifyLevel !== 'function') throw new Error('Missing reputation.classifyLevel');
    if (typeof tlSiteTrust.InMemorySiteTrustScoreStore !== 'function') throw new Error('Missing tlSiteTrust.InMemorySiteTrustScoreStore');
    console.log('[smoke-tarballs] Imported and verified all ' + Object.keys(mods).length + ' public ESM entrypoints from tarballs OK.');
  `;
  writeFileSync(join(consumerDir, 'smoke.mjs'), smokeScript, 'utf8');
  execFileSync(process.execPath, [join(consumerDir, 'smoke.mjs')], { cwd: consumerDir, stdio: 'inherit' });

  if (checkTypes) {
    const typeAssertions = [];
    const names = new Set();
    for (const dir of PACKAGE_DIRS) {
      const manifest = JSON.parse(readFileSync(join(root, 'packages', dir, 'package.json'), 'utf8'));
      const installedDir = join(consumerDir, 'node_modules', manifest.name);
      const pkg = JSON.parse(readFileSync(join(installedDir, 'package.json'), 'utf8'));
      if (pkg.publishConfig?.access !== 'public' || pkg.license !== 'Apache-2.0'
        || pkg.engines?.node !== '>=24' || pkg.repository?.directory !== `packages/${dir}`
        || !pkg.files?.includes('dist') || !existsSync(join(installedDir, 'LICENSE'))
        || pkg.types !== pkg.exports?.['.']?.types) throw new Error(`Invalid publication metadata for ${manifest.name}`);
      for (const [subpath, target] of Object.entries(pkg.exports)) {
        const name = subpath === '.' ? pkg.name : `${pkg.name}/${subpath.slice(2)}`;
        names.add(name);
        if (!existsSync(join(installedDir, target.types))) throw new Error(`Missing types for ${name}`);
        const mod = await import(pathToFileURL(join(installedDir, target.import)).href);
        // Check that every actual runtime export exists in the public declaration surface.
        typeAssertions.push(`type Missing_${names.size} = AssertNever<Exclude<${Object.keys(mod).map(JSON.stringify).join(' | ') || 'never'}, keyof typeof import(${JSON.stringify(name)})>>;`);
      }
    }
    const smokeNames = new Set([...smokeScript.matchAll(/from '([^']+)'/g)].map((match) => match[1]));
    if (names.size !== 17 || smokeNames.size !== names.size || [...names].some((name) => !smokeNames.has(name))) {
      throw new Error('Smoke imports must match all 17 declared entrypoints');
    }
    writeFileSync(join(consumerDir, 'smoke.mts'), `${smokeScript}\ntype AssertNever<T extends never> = T;\n${typeAssertions.join('\n')}\n`, 'utf8');
    execFileSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'),
      '--noEmit', '--strict', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--target', 'ES2022', 'smoke.mts'], {
      cwd: consumerDir, stdio: 'inherit',
    });
    console.log(`[smoke-types] Verified all ${names.size} public entrypoints with strict NodeNext resolution.`);
  }
} finally {
  if (existsSync(workDir)) rmSync(workDir, { recursive: true, force: true });
}
