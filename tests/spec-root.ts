import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));

/**
 * Resolves the pinned vera-trust-spec `spec/` directory.
 * - CI sets VERARED_SPEC_DIR to the checked-out SPEC-PIN.json commit.
 * - Local dev defaults to sibling ../vera-trust-spec/spec.
 */
export function resolveSpecDir(): string {
  const candidate = process.env.VERARED_SPEC_DIR
    ? resolve(process.env.VERARED_SPEC_DIR)
    : resolve(repoRoot, '../vera-trust-spec/spec');
  if (!existsSync(candidate)) {
    throw new Error(
      `Pinned @verared/spec directory not found at ${candidate}. Set VERARED_SPEC_DIR or place verared/vera-trust-spec as a sibling directory.`,
    );
  }
  return candidate;
}

export function resolveSpecUrl(subpath: string): URL {
  const full = resolve(resolveSpecDir(), subpath);
  return pathToFileURL(subpath.endsWith('/') ? `${full}/` : full);
}
