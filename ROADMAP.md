# Vera Trust Stack roadmap

Node 24 and the draft recorded in [`SPEC-PIN.json`](./SPEC-PIN.json) are the current baseline. The [specification vision](https://github.com/verared/vera-trust-spec/blob/main/VISION.md) and the specification's own roadmap define the standards track. This roadmap records package and integration evidence.

## Delivered

| Milestone | Evidence and scope |
|---|---|
| [v0.1.0-alpha.1](https://github.com/verared/vera-trust-stack/releases/tag/v0.1.0-alpha.1) | Extracted seven Apache-2.0 packages with versioned dependencies, a pinned specification, an acyclic layer graph and 17 ESM entrypoints installable from release tarballs. |
| Host-neutral package hardening | Trusted ingress, Web Bot Auth options, APW encryption keys and ATProto storage factories are injected. `check:boundaries` checks the exact specification pin, licenses, host neutrality and import graphs. `@verared/net` and the `@verared/apw` root have zero `node:*` imports in source and build output. All seven packages ship declarations compatible with strict `NodeNext`. |
| Identity and executable conformance | APW includes DNS identity resolution, signed artifacts, key history, reader conduct and scoring. CI runs the machine-readable vectors from the pinned spec. V-06 remains outside the executable minimal set; a passing reference suite is not independent verification. A publisher-signed capability manifest can be verified without implementing a host installer or granting a capability. |
| Witness aggregation and federation | Witness verification, calibration and peer synchronization re-verify evidence locally. V-16 covers deterministic ordering; E-14 defines signed page artifacts with bounded fetching and cache/single-flight in the library. These mechanisms do not open a public discovery endpoint or establish independent peers. |
| Egress and signed-reader security | Neutral primitives cover client-IP derivation, DNS pinning, bounded transport and operation/window budgets. Web Bot Auth checks signed requests and replay protection with an injectable nonce store. Local Trust Protocol acquires and verifies identity proof packages within the bounded G2/G3 Node scope. The reputation package projects admitted evidence; it does not itself admit a `community attester`, activate R-05 or grant access. |
| Static reputation and optional adapters | The G4 engine covers 117 audited REP-01…REP-11 cases, including duplicate-dimension rejection and rounded/unrounded projection comparisons. Cloud Images signs image sidecars and checks the byte hash and signer; the origin field is a signed declaration, not detected provenance. ATProto uses forward/reverse handle and DID checks and an explicit APW link before showing related trust information. Neither adapter is required for core verification. |
| [v0.1.0-alpha.2](https://github.com/verared/vera-trust-stack/releases/tag/v0.1.0-alpha.2) | The host can share a `ResolutionBudget` with the root Web Bot Auth verifier; the verifier retains its fail-closed `503` for invalid budget configuration before directory egress. The release baseline passed **614 Vitest tests** (47 files, one opt-in test skipped). `smoke:tarballs` covers all 17 ESM entrypoints; `smoke:types` also compiles a Gatekeeper consumer. The [tag workflow](./.github/workflows/release.yml) published seven tarballs and `SHA256SUMS`. See the [migration guide](./docs/MIGRATION-v0.1.0-alpha.2.md). |

## Toward v0.1.0-rc.1 and v0.1.0

Record what each host and runtime actually passes. Treat controlled fixtures, a maintainer-assisted trial and independently operated deployments as different evidence.

| Milestone | Evidence needed |
|---|---|
| Gatekeeper in real consumers | Exercise trusted ingress, shared budget, key-to-DID binding, admitted evidence, read policy and HTTP response together in a host. Record results for verified, unverified and unavailable inputs, including witness-to-index behavior where deployed. Keep transport failures separate from reputation and measure operational limits without changing them implicitly. |
| B3 / ADR 0003 | Record the decision on unsigned automated readers and test `allow`/`block`/`charge` across public and governed routes. Alpha.2 did not change this behavior. Any approved anonymous exception must preserve the boundaries in the migration guide. |
| npm publication | Verify scope access and publish permissions, publish packages in dependency order, and repeat clean external ESM and `NodeNext` install checks against the registry. Keep release checksums and the spec pin reproducible. |
| Workers and Deno | Test actual runtime behavior per public entrypoint and document supported surfaces and their limits. Keep `@verared/net` and the `@verared/apw` root export free of Node built-ins. |
| `@verared/cli` | Define the initial command and input/output contracts. Verify packaging and invocation from a clean external install before publishing. |
| `@noble/post-quantum` | Review the pinned dependency and its Web Bot Auth integration. Record the reviewed versions, algorithm coverage, interoperability results, and findings before making audit claims. |
| `@verared/cloud-images`: R2 and formats | Verify an R2 adapter through the storage interface and publish a format matrix backed by signing and verification fixtures. Keep host credentials and deployment configuration out of the core package. |

The [Vera Trust Spec roadmap](https://github.com/verared/vera-trust-spec/blob/main/ROADMAP.md) owns S4, S6, G5, second-operator and independent-implementation evidence, and R-05 activation criteria. Stack CI and package releases do not set those milestones' status.

## v0.2 candidates

Consider pluggable external anchoring and timestamp providers only with a versioned opt-in contract and corresponding specification evidence. Define provider verification and failure behavior, test interchangeable providers, and keep the v0.1 core independent of any provider, with unchanged identifiers and signed bytes.

_Editorial provenance: adapted from the [source roadmap](https://github.com/geroiloyola/portaless/blob/main/ROADMAP.md), especially executable conformance, witness and federation mechanisms, signed manifests, egress and reader security, and the evidence-based release criteria._
