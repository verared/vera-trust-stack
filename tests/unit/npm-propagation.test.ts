import { expect, it, vi } from 'vitest';
import { installWithPropagationRetries, publishAndWait, waitUntilPublished } from '../../scripts/npm-propagation.mjs';

const name = '@verared/net';
const version = '0.1.0-rc.1';
const npmFailure = (code: string, message = '') => Object.assign(new Error(message || code), {
  stderr: `npm error code ${code}\nnpm error ${message}\n`,
});

function clock() {
  let elapsed = 0;
  return { now: () => elapsed, pause: vi.fn(async (ms: number) => { elapsed += ms; }) };
}

it('waits for the exact version, retrying missing or stale metadata every four seconds', async () => {
  const timer = clock();
  const npm = vi.fn().mockRejectedValueOnce(npmFailure('E404'))
    .mockResolvedValueOnce({ stdout: '0.1.0-alpha.2\n' })
    .mockResolvedValueOnce({ stdout: `${version}\n` });
  await waitUntilPublished(name, version, { npm, ...timer });
  expect(npm).toHaveBeenCalledTimes(3);
  expect(npm.mock.calls[0][0].slice(0, 5)).toEqual(['view', `${name}@${version}`, 'version', '--registry', 'https://registry.npmjs.org']);
  expect(timer.pause.mock.calls).toEqual([[4000], [4000]]);
});

it('times out after 90 seconds if staging never becomes visible', async () => {
  const timer = clock();
  const npm = vi.fn().mockRejectedValue(npmFailure('E404'));
  await expect(waitUntilPublished(name, version, { npm, ...timer })).rejects.toThrow(`${name}@${version} still not visible`);
  expect(timer.now()).toBe(90_000);
  expect(npm.mock.lastCall?.[1].timeout).toBe(2000);
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
