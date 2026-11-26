import { expect, it, vi } from 'vitest';
import { installWithPropagationRetries, publishAndWait, publishPackage, waitUntilPublished } from '../../scripts/npm-propagation.mjs';

const name = '@verared/net';
const version = '0.1.0-rc.1';
const npmFailure = (code: string, message = '') => Object.assign(new Error(message || code), {
  stderr: `npm error code ${code}\nnpm error ${message}\n`,
});

function clock() {
  let elapsed = 0;
  return { now: () => elapsed, pause: vi.fn(async (ms: number) => { elapsed += ms; }) };
}

it('waits for the exact version, retrying missing or stale metadata every ten seconds', async () => {
  const timer = clock();
  const npm = vi.fn().mockRejectedValueOnce(npmFailure('E404'))
    .mockResolvedValueOnce({ stdout: '0.1.0-alpha.2\n' })
    .mockResolvedValueOnce({ stdout: `${version}\n` });
  await waitUntilPublished(name, version, { npm, ...timer });
  expect(npm).toHaveBeenCalledTimes(3);
  expect(npm.mock.calls[0][0].slice(0, 5)).toEqual(['view', `${name}@${version}`, 'version', '--registry', 'https://registry.npmjs.org']);
  expect(timer.pause.mock.calls).toEqual([[10_000], [10_000]]);
});

it('times out after 300 seconds if staging never becomes visible', async () => {
  const timer = clock();
  const npm = vi.fn().mockRejectedValue(npmFailure('E404'));
  await expect(waitUntilPublished(name, version, { npm, ...timer })).rejects.toThrow(`${name}@${version} still not visible on https://registry.npmjs.org after 300 seconds`);
  expect(timer.now()).toBe(300_000);
  expect(npm.mock.lastCall?.[1].timeout).toBe(10_000);
});

it('publishes without waiting for registry visibility', async () => {
  const npm = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
  const wait = vi.fn();
  await publishPackage(name, version, ['publish'], { npm, wait, log: vi.fn() });
  expect(npm).toHaveBeenCalledTimes(1);
  expect(wait).not.toHaveBeenCalled();
});

it('polls after publish success and recovers only the staged-version E409', async () => {
  const npm = vi.fn().mockResolvedValueOnce({ stdout: '', stderr: '' })
    .mockRejectedValueOnce(npmFailure('E409', 'Cannot publish over previously staged version'))
    .mockRejectedValueOnce(npmFailure('E409', 'Another conflict'));
  const wait = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('visibility timeout'));
  const options = { npm, wait, log: vi.fn() };
  await publishAndWait(name, version, ['publish'], options);
  await expect(publishAndWait(name, version, ['publish'], options)).rejects.toThrow('visibility timeout');
  await expect(publishAndWait(name, version, ['publish'], options)).rejects.toThrow('Another conflict');
  expect(wait.mock.calls).toEqual([[name, version], [name, version]]);
});

it('retries E404 and ETARGET installs up to three times, without retrying other failures', async () => {
  const transient = npmFailure('ETARGET');
  const npm = vi.fn().mockRejectedValueOnce(npmFailure('E404')).mockRejectedValueOnce(transient).mockResolvedValueOnce({ stdout: 'ok' });
  const options = { npm, pause: vi.fn(), warn: vi.fn() };
  await expect(installWithPropagationRetries(['install'], {}, options)).resolves.toEqual({ stdout: 'ok' });
  expect(npm).toHaveBeenCalledTimes(3);

  npm.mockReset().mockRejectedValue(transient);
  await expect(installWithPropagationRetries(['install'], {}, options)).rejects.toBe(transient);
  expect(npm).toHaveBeenCalledTimes(4);

  const unexpected = npmFailure('E401');
  npm.mockReset().mockRejectedValue(unexpected);
  await expect(installWithPropagationRetries(['install'], {}, options)).rejects.toBe(unexpected);
  expect(npm).toHaveBeenCalledTimes(1);
});
