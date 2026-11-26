import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { npmReleasePlan, registry } from './npm-release-plan.mjs';
import { installWithPropagationRetries, waitUntilPublished } from './npm-propagation.mjs';

const plan = npmReleasePlan();
const dir = mkdtempSync(join(tmpdir(), 'verared-npm-smoke-'));
try {
  writeFileSync(join(dir, 'package.json'), JSON.stringify({
    private: true, type: 'module', dependencies: Object.fromEntries(plan.map(({ name, version }) => [name, version])),
  }));
  await Promise.all(plan.map(({ name, version }) => waitUntilPublished(name, version)));
  const { stdout, stderr } = await installWithPropagationRetries(
    ['install', '--registry', registry, '--prefer-online', '--no-audit', '--no-fund'], { cwd: dir },
  );
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  const { packages } = JSON.parse(readFileSync(join(dir, 'package-lock.json'), 'utf8'));
  const expected = new Map(plan.map((pkg) => [pkg.name, pkg.version]));
  for (const [key, info] of Object.entries(packages)) {
    const name = key.match(/(?:^|\/)node_modules\/(@verared\/[^/]+)$/)?.[1];
    if (name && (info.version !== expected.get(name) || info.link || new URL(info.resolved).origin !== registry)) {
      throw new Error(`Invalid registry resolution: ${key}`);
    }
  }
  for (const { name } of plan) if (!packages[`node_modules/${name}`]) throw new Error(`Missing registry installation of ${name}`);
  const entries = plan.flatMap(({ name, exports }) => exports.map((key) => key === '.' ? name : `${name}/${key.slice(2)}`));
  const source = `for (const name of ${JSON.stringify(entries)}) if (!Object.keys(await import(name)).length) throw new Error('Empty exports: ' + name);`;
  execFileSync(process.execPath, ['--input-type=module', '-e', source], { cwd: dir, stdio: 'inherit' });
  execFileSync(process.execPath, [join(dir, 'node_modules/.bin/verared'), '--help'], { cwd: dir, stdio: 'inherit' });
  console.log(`[smoke-npm] ${plan.length} registry packages and ${entries.length} entrypoints verified`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
