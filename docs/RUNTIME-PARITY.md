# Runtime parity

Run `npm run build` followed by `npm run smoke:runtimes`. Each row probes the compiled public entrypoint and verifies a real Ed25519 APW JWS with WebCrypto. Workers uses Miniflare/workerd with bundled package code, without injected polyfills. Deno loads the built ESM from the installed workspace in manual node_modules mode. CI requires Deno 2.9.6; local runs report explicitly when it is absent.

| Public entrypoint | Node 24 | Workers (workerd) | Deno 2.9.6 |
|---|---|---|---|
| `@verared/net` | PASS | PASS, no `nodejs_compat` | PASS |
| `@verared/apw` | PASS | PASS, no `nodejs_compat` | PASS |
| `@verared/apw/full` | PASS | PASS, no `nodejs_compat` | PASS |
| `@verared/apw/resolver` | PASS | PASS, no `nodejs_compat` | PASS |
| `@verared/apw/did-apw` | PASS | PASS, no `nodejs_compat` | PASS |
| `@verared/apw/scoring` | PASS | PASS, no `nodejs_compat` | PASS |
| `@verared/apw/federation` | PASS | PASS, no `nodejs_compat` | PASS |
| `@verared/local-trust` | PASS | Node-only; not tested | Node-only; not tested |
| `@verared/reputation` | PASS | PASS, no `nodejs_compat` | PASS |
| `@verared/trust-layer` | PASS | PASS, no `nodejs_compat` | PASS |
| `@verared/trust-layer/site-trust` | PASS | PASS, no `nodejs_compat` | PASS |
| `@verared/trust-layer/policy` | PASS | PASS, no `nodejs_compat` | PASS |
| `@verared/trust-layer/billing` | PASS | PASS, no `nodejs_compat` | PASS |
| `@verared/trust-layer/ledger` | PASS | PASS, no `nodejs_compat` | PASS |
| `@verared/trust-layer/net` | PASS | PASS, no `nodejs_compat` | PASS |
| `@verared/cloud-images` | PASS | PASS, no `nodejs_compat` | PASS |
| `@verared/identity-atproto` | PASS | PASS, no `nodejs_compat` | PASS |
| `@verared/cli` (API and `verared` bin) | PASS; installed bin probed by `smoke:tarballs` | Node-only; not tested | Node-only; not tested |

PASS covers module loading and the shared cryptographic probe. It does not establish live DoH, storage bindings, ML-DSA, or full host policy parity. The G2 transport uses the Node DNS and TLS connector and is supported only on Node; conformance there is covered by the dedicated transport tests, not this smoke. None of the tested Workers surfaces required `nodejs_compat` for this probe.
