# Vera Trust Stack roadmap

> **STATE lives here; DIRECTION lives in the [Vera Trust Spec vision](https://github.com/verared/vera-trust-spec/blob/main/VISION.md).** This roadmap records what is demonstrably available, what is still missing, and who must supply the evidence. The vision defines `NOW`, `ENABLE`, `GATED` and `OUT OF CORE`; every gated entry names the evidence that would move it. A published package, a passing fixture and an independently operated deployment are different milestones.

**Legend:** `[x]` shipped and verifiable by commit or tag · `[~]` implemented, awaiting an external real-world step · `[ ]` pending.

| Owner | Tracks |
|---|---|
| [`verared/vera-trust-spec`](https://github.com/verared/vera-trust-spec/blob/main/ROADMAP.md) | Protocol, errata, schemas, vectors, S4/S6, G5, R-05 and independent adoption evidence. |
| `verared/vera-trust-stack` | Reference packages, runtime and security, Gatekeeper wiring, adapters, release and registry evidence. |
| Consumer hosts | Own their product, operations, access decisions and field trials outside Verared. |

## Where the project stands, in one screen

| Area | State | Evidence or open condition |
|---|---|---|
| Packages, boundaries and release | `[x]` | [Alpha.2 published; rc.1 prepares eight packages and 18 entrypoints](#phase-1--package-extraction-boundaries-and-release). |
| Signed-reader verification and egress | `[x]` | [Shared budget, replay checks, 13 real-signature ML-DSA tests](#phase-2--trust-layer-and-network-security); external ML-DSA audit remains open. |
| APW, Witness Index and federation | `[~]` | [E-10/E-12/E-14/E-15 implementation](#phase-3--identity-witness-index-and-federation); no public fan-out endpoint or independent federation demonstrated. |
| Composed identity and reputation | `[x]` | [AB-STATIC-01…07 and 117 reputation cases](#phase-4--local-trust-protocol-and-reputation); bounded static scope. |
| Cloud Images and ATProto | `[x]` | [PNG embedding, external verification and optional handle/DID bridge](#phase-5--optional-image-and-at-protocol-adapters). |
| Gatekeeper in a real host and B3 | `[~]` | [B3 accepted, implemented and matrix-tested](#phase-6--gatekeeper-in-real-consumers-and-b3); real host deployment evidence remains open. |
| Registry publication | `[~]` | [Publication and exact-version registry smoke automated](#phase-7--npm-registry-publication); first rc.1 registry install pending. |
| Runtime smoke and CLI | `[x]` | [Public entrypoint probes and installed CLI conformance](#phase-8--runtime-parity-and-cli); broader deployment parity remains open. |
| Independent review and image transport expansion | `[ ]` | [Reviewed dependency and signer interoperability](#phase-9--independent-security-and-ml-dsa-review); [R2 and non-PNG round trips](#phase-10--image-storage-and-format-expansion). |

## Shipped: alpha.1 to alpha.2

### Phase 1 — Package extraction, boundaries and release

**Goal:** make the reference implementation independently installable, with reproducible boundaries and releases (structural findings E-06 and E-07).

**Status:** `[x]` [v0.1.0-alpha.1](https://github.com/verared/vera-trust-stack/releases/tag/v0.1.0-alpha.1), `d2e1d4a`, extracted seven Apache-2.0 packages: L0 `net`; L1 `apw`, `local-trust`, `reputation`; L2 `trust-layer`, `cloud-images`, `identity-atproto`. Networking and trusted-IP primitives are shared at L0. The graph is acyclic, without cross-package deep `src/` imports, and the protected Web-API graphs for `@verared/net` and `@verared/apw` `.` have zero `node:*` imports in source and `dist/`.

- The P0 hardening on `main` moved trusted ingress, signing-key storage and ATProto storage to injected contracts. `check:boundaries` checks source and distributable artifacts, neutral runtime dependencies, layer/import boundaries, licensing and the exact [`SPEC-PIN.json`](./SPEC-PIN.json). The spec stays pinned to `7787966` (`v0.1.0-draft.1`), with the same tarball hash and five JCS digests.
- [v0.1.0-alpha.2](https://github.com/verared/vera-trust-stack/releases/tag/v0.1.0-alpha.2), `cc0b805`, passed **47 Vitest files, 614 tests, one opt-in live DoH test skipped**. `smoke:tarballs` imports all **17 public ESM entrypoints** from installed archives; `smoke:types` tests their emitted declarations under strict `NodeNext` and compiles the typed Gatekeeper consumer. These checks catch packaging and declaration failures that workspace-only tests miss.
- The [tag workflow](./.github/workflows/release.yml) validates the tag and all package versions, checks the pinned spec and its tarball hash, runs build/boundaries/Vitest/both smokes, then validates seven `.tgz` files against `SHA256SUMS`. Only the publishing job can write the release. Alpha.2 shipped with all eight assets.
- **v0.1.0-rc.1 is prepared for release:** eight packages and 18 public ESM/NodeNext entrypoints, including the Node-only CLI. The current tag workflow verifies eight tarballs and `SHA256SUMS`, then publishes the prerelease and, when configured, publishes to npm with provenance. The rc.1 tag and publication are pending.

**Honest limits:** GitHub release archives and Node 24 checks do not demonstrate npm registry publication, Workers/Deno parity or live host integration. The API compile example is not a deployment test.

**Exit criterion:** a clean Node 24 checkout installs from the lockfile and passes the five gates; a clean consumer verifies seven release checksums, imports all 17 entrypoints and passes the strict types smoke. The tag resolves to the checked release commit.

### Phase 2 — Trust Layer and network security

**Goal:** verify signed automated readers and bound unauthenticated outbound work before it reaches expensive resolution (A-05, M-01 and M-04).

**Status:** `[x]` The root `@verared/trust-layer` verifier implements RFC 9421 Web Bot Auth with Ed25519 and experimental ML-DSA-44/65/87. Directory keys use `kty: "AKP"` and `pub` for ML-DSA. The shared verifier lazy-loads `@noble/post-quantum`; inability to load yields `ml_dsa_unavailable`. The optional `alg` parameter must match the directory key (`algorithm_key_mismatch`). [`webbotauth-verify-ml-dsa.test.ts`](./tests/unit/webbotauth-verify-ml-dsa.test.ts) exercises 13 real-signature cases including algorithm variants, tampering, replay and cache behavior. This signature support does not change APW's frozen signing format.

- Verify the signature before consuming its nonce. Missing nonce yields `missing_nonce`; reuse within the validity window yields `nonce_replayed`. Inject `WebBotAuthNonceStore` (or a factory) to share nonce state across host instances; the default store is local to one process.
- Alpha.2 lets the host share a `ResolutionBudget` with Web Bot Auth. Derive buckets from authenticated ingress and rotating HMAC secrets, without persisting raw IPs. Explicit configuration with missing ingress or an invalid secret returns `503 resolution_budget_misconfigured` before directory egress; a configured resolver without a trustworthy IP uses the `unknown` bucket. The default proposal uses a 60-second window: 20 attempts/8 MiB per client, eight attempts/4 MiB per origin, at most 4,096 buckets, and concurrency of eight overall and four per client or origin. These are library defaults, not measured capacity for every host.
- Directory resolution has positive/negative caching, single-flight per normalized origin and bounded concurrent cold work (eight fetches total, at most six for unreserved origins). The host controls origins eligible for reserved capacity. Sharing a budget removes an accounting split; it does not charge a new outbound attempt when no new fetch occurs or impose shared quotas across replicas.
- `createSafeFetcher` bounds time, bytes and redirect hops. Use the proper resolver and pinned transport where a host requires DNS-rebinding protection; a fetch-only invocation is not a pinned Node connector. Witness and peer readers bound remote work; history resolution respects `maxPages` (hard ceiling 40) and does not verify a chain as complete when another page is required. Verify these limits using the [egress budget](./tests/unit/resolution-budget.test.ts), [directory admission](./tests/unit/directory-admission.test.ts) and [Web Bot Auth](./tests/unit/webbotauth-verify.test.ts) regressions.

**Honest limits:** no independent audit of the ML-DSA dependency or integration, and no recorded run with a real external ML-DSA agent. A bounded directory lookup is not inbound request admission, and the similarly named `site-trust` verifier is not the shared-budget entrypoint. B3 behavior is unchanged.

**Exit criterion:** tests reproduce failure before directory egress on bad configuration, mandatory nonce and replay rejection, and shared window accounting in both call orders (host first, verifier first). On real consumers, separately verify DNS/transport capabilities and nonce-store behavior across replicas before claiming them.

### Phase 3 — Identity, Witness Index and federation

**Goal:** package APW identity and portable observations without inheriting the host's discovery, publishing or authorization decisions.

**Status:** `[x]` APW resolves `did:apw` via DNS-over-HTTPS and verifies key fingerprints, JWS/JCS and chained history. For a retired reader key, the key must appear in the verified chain and have signed at least one anchored entry; it is usable only in `[validFrom, validTo + 10 min]`, with cache validity bounded by that window. `apw-witness+jws` observations are verified against anchored witness history before comparison against the subject's chain (E-10); `head_mismatch`, `equivocation` and `backdated_entry` remain distinct outcomes.

- **Witness Index (E-12):** use `0.1 + 1.8 × (agreements + 1)/(agreements + disagreements + 2)` to calibrate a witness's base weight (starts at 1.0; approaches ~0.1–~1.9). Only observations at the consensus sequence contribute there. Base and calibration components can be published separately. Peer sync caps discovery at 50 subjects and 20 witnesses per subject per peer, then re-verifies candidates locally; a peer listing cannot inject verified state. See the [calibration and peer sync cases](./tests/unit/apw-witness-index-phase5.test.ts).
- **Federation (E-14/V-16):** verify `apw-pages+jws`, bound response size and redirects, sanitize consumable fields, and aggregate with cache, per-domain single-flight, concurrency and item limits. Defaults include a five-minute fresh cache, four concurrent loads and 50 items per peer. Previously verified cached pages may be served as explicitly stale on error; this is a discovery presentation rule, not a stale identity-proof allowance. V-16 orders the same signed input deterministically by its declared windows and tie-breaks. See the [federation](./tests/unit/apw-federation.test.ts) and [ranking](./tests/unit/apw-ranking.test.ts) cases.
- **Signed extension manifests (E-15):** verify `apw-plugin-manifest+jws` against the publisher's APW key and bind the signed `requestedCapabilities` and code hash. Installation, execution and actual capability grants remain host responsibilities; verification is not a grant or a sandbox audit. See the [manifest tests](./tests/unit/apw-plugin-manifest.test.ts).

**Honest limits:** `apw-index` is a re-verifiable observation directory, not a global ranking authority. No public federated fan-out endpoint or independent network is shipped by the libraries. Manual publication of DNS `h` and automatic appended head updates still need operational coordination (E-02).

**Exit criterion:** the installed APW exports verify valid histories/witnesses and reject the negative cases, re-check peer candidates while preserving limits, and reproduce V-16 under declared inputs. Opening live fan-out requires real independent peers publishing signed page documents and evidence from the specification's adoption gate.

### Phase 4 — Local Trust Protocol and reputation

**Goal:** keep acquisition, cryptographic verification, evidence admission, scoring and read policy distinguishable in a typed integration.

**Status:** `[x]` The bounded G2/G3 engine composes configured TXT/DoH and proof-package acquisition (A) with deterministic offline verification (B), sharing the per-operation budget and deadline. It covers `apw-identity-proof-v1`, full history and AB-STATIC-01…07. The Node connector rejects private/special-use CIDRs and hosts, pins a validated DNS address for the connection, checks TLS, refuses redirects and plaintext, and streams under a byte cap. [Composed](./tests/unit/ltp-engine-composed.test.ts) and [connector](./tests/unit/ltp-engine-ssrf.test.ts) tests exercise these paths using controlled inputs.

G4 implements 117 audited cases across REP-01…REP-11, including issuer eligibility, deduplication, community thresholds, numeric bounds, duplicate-dimension rejection and differential projection against APW scoring after documented rounding normalization. `projectSvri` receives already evaluated dimensions and T1–T5 counts. It reports provenance, inference and effective evidence; a derived prior is not an observed dimension. Use `no_data` when there is no reader evidence with positive count and weight; incomplete site SVRI exposes a pending level rather than displaying the numerical prior as measured trust. See the [reputation vector suite](./tests/unit/ltp-reputation-vectors.test.ts).

**Honest limits:** `runComposed` returns `resourceGrant: false` and `reputationAdmitted: false`. G4 static results do not authorize a signed profile, R-05 activation, real-emitter claims or G5 offline DNSSEC. The APW independent-conformance suite has V-06 missing from the portable executable minimum; witness, policy and mutation matrices still have gaps detailed in the spec roadmap.

**Exit criterion:** reproduce the bounded A/B outcomes with unchanged pin and the G4 literal/differential results, and demonstrate that incomplete or unavailable inputs are not rendered as observed evidence or treated as grants. Live integration is tracked separately below.

### Phase 5 — Optional image and AT Protocol adapters

**Goal:** make image provenance and cross-protocol identity available as optional libraries while keeping the core independent of them.

**Status:** `[x]` `@verared/cloud-images` builds a v1 payload with `contentHash` (SHA-256 of sidecar-free bytes), signed `signedAt`, contemporaneous trust snapshot and `declaredOrigin` (`human`, `ai` or `mixed`). Sign `{payload, jws}` as `apw-image+jws`; validation checks canonical payload equality, signer binding and content hash. The private PNG `pAPW` chunk is inserted or replaced before IEND, checked by CRC on extraction, and stripped byte-exactly for hashing. Local verification uses supplied keys; standalone remote verification resolves subject keys/history, including retired keys, with document fallback under the implementation's checks. See [payload](./tests/unit/cloud-images-payload.test.ts), [PNG](./tests/unit/cloud-images-png.test.ts) and [remote verification](./tests/unit/cloud-images-verify-remote.test.ts) tests.

`@verared/identity-atproto` distinguishes `parseHandle` (syntax) from `resolvableHandle` (also excludes reserved TLDs). It resolves handle ↔ DID (TXT preferred, HTTPS fallback, `did:plc`/`did:web`) and checks the claimed handle on the return path. The optional APW link reports `also_known_as`, `self` or `subdomain` confidence. `buildAtprotoReputation` can use injected identity and score-store factories for a local site or a best-effort remote public projection, and uses `no_data` when there is no usable reader evidence. The package separates discovery from trust; see the [handle](./tests/unit/atproto-handle.test.ts), [resolution](./tests/unit/atproto-resolve.test.ts) and [link](./tests/unit/atproto-link.test.ts) tests.

**Honest limits:** in v1 only PNG has built-in embedded transport; the payload validator caps image byte length at 4 MiB. External R2 storage and the JPEG/WebP/GIF transport matrix are pending. `declaredOrigin` is a signed declaration, not a detection; EXIF is neither read nor stripped. A signature over `signedAt` is not an independently witnessed timestamp. ATProto depends on DNS and `plc.directory`, discovers links by suffix rather than a global inverse index, and provides neither a PDS nor a firehose AppView. Remote trust is best effort and reader evidence remains host-scoped.

**Exit criterion:** an external consumer verifies standalone image sidecars through valid key rotation and rejects modified payloads/chunks/hashes, and can distinguish confirmed ATProto linkage, mismatches, unavailable resolution and `no_data` without converting them into positive trust.

## Toward v0.1.0-rc.1 and v0.1.0

### Phase 6 — Gatekeeper in real consumers and B3

**Goal:** exercise trusted ingress through the final authorization and HTTP response in a real consumer.

**Status:** `[~]` The [alpha.2 migration guide](./docs/MIGRATION-v0.1.0-alpha.2.md) and [typed consumer](./scripts/fixtures/gatekeeper.mts) show the root Web Bot Auth verifier with one shared window budget, trusted signer-to-reader-DID binding, bounded `local-trust` acquisition/verification, host admission of evidence, `reputation` projection and `apw/scoring` read policy. The host wires its outbound stages to the shared budget; the separate per-operation cap still applies. Keep reader scores separate from site projections, and preserve operational `429`/`503` responses and `Retry-After` where available.

**B3 / ADR 0003:** the [accepted policy](./docs/decisions/ADR-0003-b3-unsigned-readers.md) is implemented and matrix-tested in `admitAutomatedRead`. Only an explicitly public route with `ai_input=allow` and no signature headers can admit an anonymous read, without identity attribution, reputation or billing. Invalid signatures never fall back to anonymous access.

**Honest limits:** the example type-checks but does not deploy a policy or a host. Consumers must wire the admission API to their trusted route classification and still authorize verified readers and enforce settlement.

**Exit criterion:** record a real host integration that tests trusted and missing ingress, pre-auth budgets across directory/TXT/DID/history/evidence, nonce behavior, verified/unavailable identity and approved/denied policy. Exercise the accepted B3 matrix end to end, with signed and quota-failure controls. A verified proof or projection alone must never grant access.

### Phase 7 — npm registry publication

**Goal:** make one coherent package version independently installable through `npmjs.com`.

**Status:** `[~]` The tag workflow publishes verified tarballs with provenance in dependency order: `net`, `apw`, `local-trust`, `reputation`, `trust-layer`, `cloud-images`, `identity-atproto`, `cli`. Prereleases use `next`; `smoke:npm` installs exact versions from the public registry. Registry evidence for rc.1 awaits the release run.

**Honest limits:** a local tarball override can hide missing registry packages or version metadata. A release tag does not prove registry availability.

**Exit criterion:** record exact registry versions and integrity from a clean external install without workspace links or tarball overrides. The automated registry smoke imports all 18 ESM entrypoints and checks CLI help; strict `NodeNext` and the Gatekeeper consumer are checked from the verified release archives.

### Phase 8 — Runtime parity and CLI

**Goal:** apply E-05 to the stack through a runtime-by-entrypoint compatibility matrix and an independently installable CLI.

**Status:** `[x]` The [runtime smoke](./docs/RUNTIME-PARITY.md) covers imports and APW Ed25519 verification: 18 entrypoints in Node 24 and 16 each in Workers and Deno. The [Node-only CLI](./packages/cli/README.md) ships `verify` and `conformance`; a clean tarball install exercises help and all 110 pinned APW cases. The protected Web-API surfaces retain zero `node:*` imports.

**Honest limits:** the probe does not establish live DNS/egress, timeout, cancellation, stream, storage or ML-DSA parity. The bounded G2 connector and CLI remain Node-only. CLI signing is outside the current commands.

**Exit criterion:** publish actual Node 24, Workers and Deno results per supported entrypoint, including explicit unsupported cases, and run a packed CLI from a clean external install against versioned positive/negative fixtures. If signing is approved, demonstrate key isolation, signature verification and non-leakage from supported invocations.

### Phase 9 — Independent security and ML-DSA review

**Goal:** establish reviewed security and real interoperability before changing the experimental designation.

**Status:** `[~]` Ed25519 and ML-DSA-44/65/87 verification and real-signature fixtures exist. Independent review of the pinned `@noble/post-quantum` version and its integration, as well as a verified external-agent run, are open.

**Honest limits:** local signatures use a related reference environment and do not attest to external producer interoperability. An audit of the library alone does not validate directory key parsing, algorithm selection, nonce storage, cache policy or resource limits in the stack.

**Exit criterion:** publish the reviewed dependency/stack revisions, findings and dispositions, and a versioned capture of external ML-DSA interoperability with rejection cases. Keep ML-DSA experimental until that record supports a status change.

### Phase 10 — Image storage and format expansion

**Goal:** provide an optional external object-storage adapter and interoperable sidecar transport for JPEG, WebP and GIF.

**Status:** `[ ]` The storage port, signed payload and PNG transport exist. An R2 adapter and a transport contract for non-PNG formats still need implementation and runtime evidence. Follow the same sidecar-free byte hash and signer-binding rules without changing v1 identifiers.

**Honest limits:** accepting a content type in payload validation is not proof that its metadata survives a transport round trip. Object storage does not provide independent timestamping or origin detection.

**Exit criterion:** show an external R2 round trip through the public store contract, including rejected writes and integrity failures, and signed/original byte round trips plus tampering tests for each claimed format. Keep R2 credentials and operations outside the portable core.

## Classified backlog and v0.2 horizon

| Direction | Class | Condition to move |
|---|---|---|
| Gatekeeper accounting or response-mapping defects | `NOW` | Reproduce on a typed consumer; add a fixture that proves the budget and policy boundaries and confirms the fix. |
| Local CLI verifier or signer | `ENABLE` | A concrete independent implementer or emitter has a reproducible onboarding gap that the proposed command closes. |
| Public discovery fan-out | `GATED` | Independent peers publish signed pages, and controlled and live trials show bounded fan-out, local verification and correct stale/error behavior. |
| Pluggable provider interfaces for external anchors or timestamps | `GATED` | A concrete use case, approved opt-in v0.2 profile, reviewed trust and failure rules, and independent schemas/vectors and provider-verification tests. Candidate providers such as `@verared/gerarion-time` or `@verared/gus` would remain separate and Web-API pure. The v0.1 core must not import a provider or change its wire bytes or primitives. |
| Host product and monetization services | `OUT OF CORE` | Keep in consumer projects; an independent interface may be justified only by demonstrated interoperable demand. |

_Editorial provenance: [source roadmap](https://github.com/geroiloyola/portaless/blob/main/ROADMAP.md), especially the conformance, witness/federation, security, adapter and release-evidence decisions. Historical finding IDs identify the origin of the engineering work; Verared delivery status is based on these packages, tests and release artifacts._
