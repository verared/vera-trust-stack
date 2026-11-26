import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';
import { jwkThumbprint, serializeApwManifest } from '@verared/apw';
import { runCli } from '../../packages/cli/src/index';
import { resolveSpecDir } from '../spec-root';

function io() {
  return { out: vi.fn(), error: vi.fn(), fetch: vi.fn<typeof fetch>() };
}

it('validates usage without fetching an invalid domain', async () => {
  const output = io();
  expect(await runCli(['--help'], output)).toBe(0);
  expect(output.out).toHaveBeenCalledWith(expect.stringContaining('verared conformance'));
  expect(await runCli(['verify', 'https://example.org'], output)).toBe(2);
  expect(output.fetch).not.toHaveBeenCalled();
});

it('verifies the real APW TXT/DID binding and reports failure for a different fingerprint', async () => {
  const output = io();
  const pair = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  const thumbprint = await jwkThumbprint(jwk);
  const did = {
    '@context': ['https://www.w3.org/ns/did/v1'],
    id: 'did:apw:example.org',
    verificationMethod: [{ id: 'did:apw:example.org#key-1', type: 'JsonWebKey2020', controller: 'did:apw:example.org', publicKeyJwk: jwk }],
  };
  let fingerprint = thumbprint;
  output.fetch.mockImplementation(async (url) => String(url).includes('/dns-query')
    ? Response.json({ Status: 0, Answer: [{ type: 16, data: JSON.stringify(serializeApwManifest({ v: 2, siteId: 'example.org', trustUrl: '/trust/example.org', contentKinds: ['text'], k: fingerprint, h: 'A'.repeat(43) })) }] })
    : Response.json(did));
  const status = await runCli(['verify', 'example.org', '--json'], output);
  expect(status, String(output.out.mock.lastCall?.[0])).toBe(0);
  expect(JSON.parse(output.out.mock.lastCall![0])).toMatchObject({ verified: true, did: did.id, keyThumbprint: thumbprint });
  fingerprint = (thumbprint[0] === 'A' ? 'B' : 'A') + thumbprint.slice(1);
  expect(await runCli(['verify', 'example.org', '--json'], output)).toBe(1);
  expect(JSON.parse(output.out.mock.lastCall![0])).toMatchObject({ verified: false, reason: 'key_mismatch' });
});

it('runs the pinned APW vectors and treats unsupported cases as failure', async () => {
  const output = io();
  expect(await runCli(['conformance', join(resolveSpecDir(), 'vectors/v1.3')], output)).toBe(0);
  expect(output.out).toHaveBeenCalledWith('110 passed, 0 failed, 0 unsupported (11 vector files)');
  const dir = await mkdtemp(join(tmpdir(), 'verared-cli-test-'));
  try {
    await writeFile(join(dir, 'manifest.json'), JSON.stringify({ vectorFiles: [{ file: 'unsupported.json' }] }));
    await writeFile(join(dir, 'unsupported.json'), JSON.stringify({ id: 'unsupported', cases: [{ kind: 'unknown' }] }));
    expect(await runCli(['conformance', dir], output)).toBe(1);
    expect(output.out).toHaveBeenCalledWith('0 passed, 0 failed, 1 unsupported (1 vector files)');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
