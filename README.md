# Vera Trust Stack (`@verared/*`)

Open-source TypeScript/ESM reference implementation of the **Vera Trust Stack** — **APW**, **Local Trust Protocol**, **SVRI/HSVR**, neutral **Trust Layer**, **Cloud Images**, and **ATProto Identity** — published under the **Apache License 2.0**.

- **Author:** Gerardo Loyola
- **License:** [Apache-2.0](./LICENSE) (every package includes its own `LICENSE` file)
- **Pinned Specification:** [`SPEC-PIN.json`](./SPEC-PIN.json) → [`verared/vera-trust-spec`](https://github.com/verared/vera-trust-spec) (`v0.1.0-draft.1`, commit `7787966a38fb08ceb509df295ee814ba93af4dec`, G1 corpus digest `wNQ9gG2BPs8JO1wPsiPgoz265juDT-TCjuGMbTzSYXA`)
- **Roadmap:** [Implementation and compatibility milestones](./ROADMAP.md)
- **Vision:** [Portable identity and independent verification](https://github.com/verared/vera-trust-spec/blob/main/VISION.md)
- **Migration:** [From `v0.1.0-alpha.1` to `v0.1.0-alpha.2`](./docs/MIGRATION-v0.1.0-alpha.2.md)

## What this repo is / What this repo is not

- **Is:** A host-neutral TypeScript/ESM reference implementation with reusable packages and conformance tests against the pinned specification.
- **Is not:** The normative specification, a host application, or a dependency of independent implementations.

### Ecosystem and licenses

The three `geroiloyola/portaless*` repositories are listed only as a non-normative reference ecosystem. Portaless is the first consumer; neither Verared repository depends on or is coupled to these three repositories.

| Repository | License | Responsibility |
|---|---|---|
| [`verared/vera-trust-spec`](https://github.com/verared/vera-trust-spec) | CC BY 4.0 | Specification, schemas, and test vectors |
| [`verared/vera-trust-stack`](https://github.com/verared/vera-trust-stack) | Apache-2.0 | TypeScript reference implementation |
| [`geroiloyola/portaless-plugin-sdk`](https://github.com/geroiloyola/portaless-plugin-sdk) | MIT | Public contract for plugin authors |
| [`geroiloyola/portaless-templates`](https://github.com/geroiloyola/portaless-templates) | CC0-1.0 | Reusable templates |
| [`geroiloyola/portaless`](https://github.com/geroiloyola/portaless) | AGPL-3.0-or-later | Host application and its integrations |

---

## How the layers fit

APW resolves domain-backed identities and verifies signed artifacts and history. Local Trust Protocol acquires bounded proof material and checks it against the caller's policy. SVRI projects admitted evidence with its provenance and uncertainty; HSVR reconstructs that assessment over time. A Witness Index helps find verifiable observations, and a `community attester` provides attributable signed evidence. Neither witness discovery nor a score confers access.

Host applications supply ingress, persistence, policy and settlement adapters. Web Bot Auth can authenticate a signed automated reader; content policies express `allow`, `block` or `charge` for AI input. Search and training preferences are cooperative signals. The libraries provide verification and policy primitives; the host decides how to enforce them and expose public or governed responses.

## Packages (`0.1.0-alpha.2`)

| Layer | Package | Public entrypoints | Purpose | Runtime |
|---|---|---|---|---|
| **L0-net** | [`@verared/net`](./packages/net) | `.` | Bounded fetch, trusted-ingress helpers and egress budgets | Web APIs; no `node:*` imports |
| **L1** | [`@verared/apw`](./packages/apw-resolver) | `.`, `./full`, `./resolver`, `./did-apw`, `./scoring`, `./federation` | Identity, signed history, Witness Index, scoring and federated artifacts | Node 24 baseline; `.` uses Web APIs without `node:*` imports |
| **L1** | [`@verared/local-trust`](./packages/ltp-engine) | `.` | Bounded acquisition and deterministic verification of identity proofs | Node 24 |
| **L1** | [`@verared/reputation`](./packages/ltp-reputation) | `.` | Deterministic SVRI projection of admitted evidence | Node 24 baseline |
| **L2** | [`@verared/trust-layer`](./packages/trust-layer) | `.`, `./site-trust`, `./policy`, `./billing`, `./ledger`, `./net` | Web Bot Auth, policy, budgets, usage and settlement interfaces | Node 24 baseline |
| **L2** | [`@verared/cloud-images`](./packages/cloud-images) | `.` | Signed image sidecars and verification | Node 24 baseline |
| **L2** | [`@verared/identity-atproto`](./packages/identity-atproto) | `.` | AT Protocol identity resolution and links to APW evidence | Node 24 baseline |

All **7 packages and 17 public entrypoints** ship ESM and TypeScript declarations checked with strict `NodeNext`. The Web-API import boundary is not a claim of deployment parity across Workers and Deno; see the [roadmap](./ROADMAP.md).

Development also includes [`@verared/cli`](./packages/cli), a Node-only command-line verifier with `verify` and `conformance`. It is the eighth workspace package and is not part of the published alpha.2 assets listed below. See the [runtime smoke matrix](./docs/RUNTIME-PARITY.md) for the tested surfaces.

---

## Consuming via GitHub Release Tarballs (No Registry Token Required)

Use Node 24 and take all seven archives from the same [published `v0.1.0-alpha.2` prerelease](https://github.com/verared/vera-trust-stack/releases/tag/v0.1.0-alpha.2). To verify and install exactly the bytes you checked, run this in an empty consumer directory:

```bash
set -e
release=https://github.com/verared/vera-trust-stack/releases/download/v0.1.0-alpha.2
mkdir vendor
curl -fsSL "$release/SHA256SUMS" -o vendor/SHA256SUMS
for pkg in net apw local-trust reputation trust-layer cloud-images identity-atproto; do
  filename="verared-$pkg-0.1.0-alpha.2.tgz"
  curl -fsSL "$release/$filename" -o "vendor/$filename"
done
(cd vendor && sha256sum -c --strict SHA256SUMS)
```

Use the following `package.json`. The overrides keep transitive workspace dependencies on the same local archives. Run `npm install` once to create the lockfile, then use `npm ci` with that lockfile and the verified archives:

```json
{
  "dependencies": {
    "@verared/net": "file:vendor/verared-net-0.1.0-alpha.2.tgz",
    "@verared/apw": "file:vendor/verared-apw-0.1.0-alpha.2.tgz",
    "@verared/local-trust": "file:vendor/verared-local-trust-0.1.0-alpha.2.tgz",
    "@verared/reputation": "file:vendor/verared-reputation-0.1.0-alpha.2.tgz",
    "@verared/trust-layer": "file:vendor/verared-trust-layer-0.1.0-alpha.2.tgz",
    "@verared/cloud-images": "file:vendor/verared-cloud-images-0.1.0-alpha.2.tgz",
    "@verared/identity-atproto": "file:vendor/verared-identity-atproto-0.1.0-alpha.2.tgz"
  },
  "overrides": {
    "@verared/net": "$@verared/net",
    "@verared/apw": "$@verared/apw",
    "@verared/local-trust": "$@verared/local-trust",
    "@verared/reputation": "$@verared/reputation",
    "@verared/trust-layer": "$@verared/trust-layer",
    "@verared/cloud-images": "$@verared/cloud-images",
    "@verared/identity-atproto": "$@verared/identity-atproto"
  }
}
```

---

## Development & Verification

Run `npm ci` with Node 24. For the vector tests, check out the exact specification commit from `SPEC-PIN.json` and set `VERARED_SPEC_DIR` to its `spec/` directory (the default expects a sibling checkout). Run the build before the boundary guard and tests.

| Gate | Evidence |
|---|---|
| `npm run build` | Seven packages compile to ESM and declarations. |
| `npm run check:boundaries` | License, package DAG, host neutrality, Web-API import graphs and exact specification pin. |
| `npm test -- --maxWorkers=2` | Alpha.2 baseline: 47 files, 614 passing tests and one opt-in live DoH test skipped. |
| `npm run smoke:tarballs` | An isolated consumer imports all 17 ESM entrypoints. |
| `npm run smoke:types` | All 17 entrypoints and the Gatekeeper consumer compile with strict `NodeNext` from the tarballs. |
| `npm run pack:release` | Seven versioned `.tgz` files and `SHA256SUMS` in a clean output directory; the [tag workflow](./.github/workflows/release.yml) gates and publishes the assets. |

## Gatekeeper integration

Use the root `@verared/trust-layer` verifier with a trusted ingress resolver and a shared `ResolutionBudget` for host-controlled egress. Bind the verified signing key to the reader's DID before calling the bounded identity verifier in `@verared/local-trust`. Admit evidence under the appropriate profile, keep reader scores separate from public site projections in `@verared/reputation`, then evaluate the read policy with `@verared/apw/scoring`. A valid proof or public level alone does not grant access. Keep unavailable verification distinct from invalid credentials; the unsigned-reader rule was not changed by alpha.2.

See the [migration and wiring guide](./docs/MIGRATION-v0.1.0-alpha.2.md) for exact signatures, fail-closed behavior and the B3 decision boundary.

The [accepted B3 ADR](./docs/decisions/ADR-0003-b3-unsigned-readers.md) describes the admission API added after alpha.2. The tag workflow can also publish the verified archives to npm in dependency order and run an isolated registry smoke when `NPM_TOKEN` is configured. To validate packaging and order locally, run `node scripts/publish-npm.mjs --dry-run`.

## Release and integration status

- **Shipped:** [alpha.2 package and release evidence](./ROADMAP.md#phase-1--package-extraction-boundaries-and-release), [signed-reader security](./ROADMAP.md#phase-2--trust-layer-and-network-security) and [bounded identity and reputation scope](./ROADMAP.md#phase-4--local-trust-protocol-and-reputation).
- **To demonstrate before broader claims:** [real Gatekeeper and B3 coverage](./ROADMAP.md#phase-6--gatekeeper-in-real-consumers-and-b3), [registry installation](./ROADMAP.md#phase-7--npm-registry-publication), [runtime parity and CLI](./ROADMAP.md#phase-8--runtime-parity-and-cli) and [independent ML-DSA review](./ROADMAP.md#phase-9--independent-security-and-ml-dsa-review). The Node 24 fixtures do not establish those results.

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for DCO (`Signed-off-by`) requirements.
