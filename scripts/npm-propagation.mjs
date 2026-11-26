import { execFile } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { promisify } from 'node:util';
import { registry } from './npm-release-plan.mjs';

const exec = promisify(execFile);
const pollInterval = 4_000;
const publishTimeout = 90_000;

export function runNpm(args, options) {
  return exec('npm', args, { maxBuffer: 4 * 1024 * 1024, ...options });
}

function npmErrorCode(error) {
  return /^(?:npm (?:error|ERR!) )?code\s+([A-Z0-9_]+)\s*$/mi.exec(error.stderr ?? '')?.[1]?.toUpperCase();
}

function isMissingVersion(error) {
  return ['E404', 'ETARGET'].includes(npmErrorCode(error));
}

export async function waitUntilPublished(pkgName, version, {
  npm = runNpm, now = () => performance.now(), pause = sleep,
} = {}) {
  const spec = `${pkgName}@${version}`;
  const deadline = now() + publishTimeout;
  while (now() < deadline) {
    const started = now();
    try {
      const { stdout } = await npm([
        'view', spec, 'version', '--registry', registry, '--prefer-online', '--fetch-retries=0',
      ], { timeout: Math.min(pollInterval, Math.ceil(deadline - started)) });
      if (stdout.trim() === version) return;
    } catch (error) {
      const transient = ['E408', 'E429', 'E500', 'E502', 'E503', 'E504', 'ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN'];
      if (!isMissingVersion(error) && !error.killed && !transient.includes(npmErrorCode(error))) throw error;
    }
    const delay = Math.min(started + pollInterval, deadline) - now();
    if (delay > 0) await pause(delay);
  }
  throw new Error(`${spec} still not visible on ${registry} after 90 seconds`);
}

export async function publishAndWait(pkgName, version, args, {
  npm = runNpm, wait = waitUntilPublished, log = console.log,
} = {}) {
  try {
    const { stdout, stderr } = await npm(args);
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
  } catch (error) {
    if (npmErrorCode(error) !== 'E409' || !/Cannot publish over previously staged version/i.test(error.stderr ?? '')) throw error;
    log(`[staged] ${pkgName}@${version}: waiting for npm to promote the staged version`);
  }
  await wait(pkgName, version);
  log(`[visible] ${pkgName}@${version}`);
}

export async function installWithPropagationRetries(args, options, {
  npm = runNpm, pause = sleep, warn = console.warn,
} = {}) {
  const maxRetries = 3;
  for (let attempt = 0; ; attempt++) {
    try {
      return await npm(args, options);
    } catch (error) {
      if (attempt === maxRetries || !isMissingVersion(error)) throw error;
      warn(`[smoke-npm] ${npmErrorCode(error)} from registry; retrying install (${attempt + 1}/${maxRetries})`);
      await pause(pollInterval);
    }
  }
}
