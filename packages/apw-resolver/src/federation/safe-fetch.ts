/**
 * Compatibility re-export of hardened safe-fetch from `@verared/net` (L0-net).
 */
export {
  BLOCKED_EGRESS_CIDRS,
  SAFE_FETCH_DEFAULTS,
  isPrivateIp,
  assertSafeUrl,
  createSafeFetcher,
} from "@verared/net";
export type {
  SafeFetchLimits,
  SafeFetchFailure,
  SafeFetchResult,
  PinnedFetch,
  SafeFetchDeps,
  SafeFetcher,
} from "@verared/net";
