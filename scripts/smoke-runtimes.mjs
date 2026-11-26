import { execFileSync, spawnSync } from 'node:child_process';
import { isBuiltin } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';

const root = fileURLToPath(new URL('../', import.meta.url));
const packages = readdirSync(new URL('../packages/', import.meta.url)).sort();
const entries = packages.flatMap((dir) => {
  const pkg = JSON.parse(readFileSync(new URL(`../packages/${dir}/package.json`, import.meta.url), 'utf8'));
  return Object.entries(pkg.exports).map(([subpath, { import: target }]) => ({
    name: subpath === '.' ? pkg.name : `${pkg.name}/${subpath.slice(2)}`,
    url: new URL(`../packages/${dir}/${target}`, import.meta.url).href,
    nodeOnly: pkg.name === '@verared/local-trust' || pkg.name === '@verared/cli',
  }));
});
const denoCheck = spawnSync('deno', ['--version'], { encoding: 'utf8' });
if (denoCheck.error?.code === 'ENOENT') {
  if (process.argv.includes('--require-deno')) throw new Error('Deno is required but is not installed');
  console.log('Deno not installed; checks skipped. CI requires Deno.');
} else if (denoCheck.status !== 0) throw new Error('Deno failed to start');
const deno = denoCheck.status === 0;

const apw = entries.find(({ name }) => name === '@verared/apw').url;
function probe(url) {
  return `import * as entry from ${JSON.stringify(url)};
import { jcs, verifySiteJws } from ${JSON.stringify(apw)};
async function run() {
  if (!Object.keys(entry).length) throw new Error('Empty entrypoint');
  const kp = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']);
  const encode = bytes => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  const utf8 = new TextEncoder();
  const typ = 'apw-manifest+jws';
  const p = encode(utf8.encode(jcs({ hello: 'verared' })));
  const h = encode(utf8.encode(JSON.stringify({ alg: 'EdDSA', typ, kid: 'fixture' })));
  const sig = await crypto.subtle.sign('Ed25519', kp.privateKey, utf8.encode(h + '.' + p));
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', kp.publicKey);
  const result = await verifySiteJws(h + '.' + p + '.' + encode(new Uint8Array(sig)), publicKeyJwk, { kid: 'fixture', typ });
  if (!result.ok) throw new Error('APW signature verification failed: ' + result.reason);
}`;
}

const workers = [];
for (const [i, entry] of entries.entries()) {
  const source = probe(entry.url);
  execFileSync(process.execPath, ['--input-type=module', '-e', source + '\nawait run();'], { cwd: root, stdio: 'pipe' });
  if (entry.nodeOnly) continue;
  if (deno) execFileSync('deno', ['eval', '--node-modules-dir=manual', source + '\nawait run();'], { cwd: root, stdio: 'pipe' });
  const bundled = await build({
    stdin: { contents: source.replaceAll('file://', '') + '\nexport default { async fetch() { await run(); return new Response("ok"); } };', resolveDir: root },
    bundle: true, write: false, format: 'esm', platform: 'browser', conditions: ['workerd', 'worker'],
    plugins: [{ name: 'workers-native-builtins', setup(builder) {
      builder.onResolve({ filter: /.*/ }, ({ path }) => isBuiltin(path) ? { path, external: true } : undefined);
    } }],
    metafile: true, logLevel: 'silent',
  });
  const compat = Object.values(bundled.metafile.outputs).some((out) => out.imports.some(({ path }) => isBuiltin(path)));
  workers.push({ entry, compat, options: { name: `w${i}`, modules: true, script: bundled.outputFiles[0].text,
    compatibilityDate: '2025-04-01', compatibilityFlags: compat ? ['nodejs_compat'] : [] } });
}

const mf = new Miniflare({ workers: workers.map(({ options }) => options) });
try {
  for (const worker of workers) {
    const response = await (await mf.getWorker(worker.options.name)).fetch('https://smoke.example/');
    const text = await response.text();
    if (!response.ok || text !== 'ok') throw new Error(`${worker.entry.name} failed on Workers: ${response.status} ${text}`);
  }
} finally {
  await mf.dispose();
}
for (const entry of entries) {
  const worker = workers.find((row) => row.entry === entry);
  console.log(`${entry.name} | Node: PASS | Workers: ${entry.nodeOnly ? 'Node-only' : worker.compat ? 'PASS (nodejs_compat)' : 'PASS (no nodejs_compat)'} | Deno: ${entry.nodeOnly ? 'Node-only' : deno ? 'PASS' : 'SKIP'}`);
}
