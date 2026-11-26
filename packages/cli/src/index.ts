import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { resolveApwIdentity } from '@verared/apw';
import { checkSurfaceConstants, runVector, type VectorReport } from './conformance';

const usage = 'Usage: verared verify <domain> [--json]\n       verared conformance <vectors-dir>';
export interface CliIO {
  out(line: string): void;
  error(line: string): void;
  fetch?: typeof fetch;
}

async function json(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8'));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function conformance(dir: string, io: CliIO): Promise<number> {
  const manifest = await json(join(dir, 'manifest.json'));
  if (!isRecord(manifest)) throw new Error('Expected a vector manifest object');
  const entries: unknown = manifest.vectorFiles ?? manifest.vectors;
  if (!Array.isArray(entries) || entries.length === 0) throw new Error('Expected a non-empty APW or SVRI vector manifest');
  const files = new Set<string>();
  for (const entry of entries) {
    if (!isRecord(entry) || typeof entry.file !== 'string' || !/^[\w-]+\.json$/.test(entry.file) || entry.file === 'manifest.json') {
      throw new Error('Invalid vector filename in manifest');
    }
    files.add(entry.file);
  }
  const reports: VectorReport[] = [];
  for (const filename of files) {
    const vector = await json(join(dir, filename));
    if (!isRecord(vector)) throw new Error(`Expected a vector object in ${filename}`);
    const report = await runVector(vector);
    if (report.total === 0) throw new Error(`No executable cases in ${filename}`);
    reports.push(report);
    for (const row of report.results) if (row.status !== 'pass') io.error(`${report.vector}: ${row.label}: ${row.status}${row.detail ? ` (${row.detail})` : ''}`);
  }
  const counts = reports.reduce((all, row) => ({ passed: all.passed + row.passed, failed: all.failed + row.failed, unsupported: all.unsupported + row.unsupported }),
    { passed: 0, failed: 0, unsupported: 0 });
  const missing = checkSurfaceConstants();
  if (missing.length) io.error(`Missing or invalid APW exports: ${missing.join(', ')}`);
  io.out(`${counts.passed} passed, ${counts.failed} failed, ${counts.unsupported} unsupported (${reports.length} vector files)`);
  return counts.failed || counts.unsupported || missing.length ? 1 : 0;
}

export async function runCli(args: readonly string[], io: CliIO): Promise<number> {
  if (args.length === 1 && args[0] === '--help') {
    io.out(usage);
    return 0;
  }
  try {
    const [command, value, flag] = args;
    if (command === 'conformance' && args.length === 2 && value) return await conformance(value, io);
    if (command === 'verify' && value && (args.length === 2 || (args.length === 3 && flag === '--json'))) {
      const domain = value.toLowerCase().replace(/\.$/, '');
      if (domain.length > 253 || !/^(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)+[a-z](?:[a-z\d-]{0,61}[a-z\d])?$/.test(domain)) {
        throw new Error('Expected a DNS domain (use ASCII/Punycode)');
      }
      const signal = AbortSignal.timeout(10_000);
      const result = await resolveApwIdentity(domain, (url, init) => (io.fetch ?? fetch)(url, { ...init, signal, redirect: 'error' }));
      const summary = { did: result.did, verified: result.verified, reason: result.reason, keyThumbprint: result.keyThumbprint };
      io.out(flag === '--json' ? JSON.stringify(summary) : `${summary.did}: ${summary.verified ? 'verified' : `not verified (${summary.reason})`}`);
      return summary.verified ? 0 : 1;
    }
    throw new Error(usage);
  } catch (error) {
    io.error(error instanceof Error ? error.message : String(error));
    return 2;
  }
}
