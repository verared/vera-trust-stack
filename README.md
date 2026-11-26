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

## Packages (`0.1.0`)

| Layer | Package | Public entrypoints | Purpose | Runtime |
|---|---|---|---|---|
| **L0-net** | [`@verared/net`](./packages/net) | `.` | Bounded fetch, trusted-ingress helpers and egress budgets | Web APIs; no `node:*` imports |
| **L1** | [`@verared/apw`](./packages/apw-resolver) | `.`, `./full`, `./resolver`, `./did-apw`, `./scoring`, `./federation` | Identity, signed history, Witness Index, scoring and federated artifacts | Node 24 baseline; `.` uses Web APIs without `node:*` imports |
| **L1** | [`@verared/local-trust`](./packages/ltp-engine) | `.` | Bounded acquisition and deterministic verification of identity proofs | Node 24 |
| **L1** | [`@verared/reputation`](./packages/ltp-reputation) | `.` | Deterministic SVRI projection of admitted evidence | Node 24 baseline |
| **L2** | [`@verared/trust-layer`](./packages/trust-layer) | `.`, `./site-trust`, `./policy`, `./billing`, `./ledger`, `./net` | Web Bot Auth, policy, budgets, usage and settlement interfaces | Node 24 baseline |
| **L2** | [`@verared/cloud-images`](./packages/cloud-images) | `.` | Signed image sidecars and verification | Node 24 baseline |
| **L2** | [`@verared/identity-atproto`](./packages/identity-atproto) | `.` | AT Protocol identity resolution and links to APW evidence | Node 24 baseline |
| **L2** | [`@verared/cli`](./packages/cli) | `.`; `verared` binary | Verify an APW identity binding or run specification vectors | Node-only |

All **8 packages and 18 public entrypoints** ship ESM and TypeScript declarations checked with strict `NodeNext`. See the [runtime smoke matrix](./docs/RUNTIME-PARITY.md) for the tested surfaces.

---

## Install from npm

Use Node 24. The eight `0.1.0-rc.1` packages are available on [npmjs.com](https://www.npmjs.com/package/@verared/trust-layer/v/0.1.0-rc.1). The stable `0.1.0` cut is prepared; the commands below target the stable release **once the tag workflow publishes it**:

```bash
npm install @verared/trust-layer
npm install --save-exact @verared/trust-layer@0.1.0
npx @verared/cli@0.1.0 --help
```

Choose either install command. Pin other directly consumed `@verared/*` packages to the same version and commit the consumer lockfile. To use the already published release candidate, specify `@0.1.0-rc.1` explicitly.

## Consuming via GitHub Release Tarballs (No Registry Token Required)

Take all eight archives from the same release. The example targets `v0.1.0` once published; use `version=0.1.0-rc.1` to verify the [published release candidate](https://github.com/verared/vera-trust-stack/releases/tag/v0.1.0-rc.1) today. Run in an empty consumer directory:

```bash
set -e
version=0.1.0
release="https://github.com/verared/vera-trust-stack/releases/download/v$version"
mkdir vendor
curl -fsSL "$release/SHA256SUMS" -o vendor/SHA256SUMS
packages=(net apw local-trust reputation trust-layer cloud-images identity-atproto cli)
for pkg in "${packages[@]}"; do
  filename="verared-$pkg-$version.tgz"
  curl -fsSL "$release/$filename" -o "vendor/$filename"
done
(cd vendor && sha256sum -c --strict SHA256SUMS)
npm init -y
for pkg in "${packages[@]}"; do
  npm pkg set "dependencies.@verared/$pkg=file:vendor/verared-$pkg-$version.tgz" \
    "overrides.@verared/$pkg=\$@verared/$pkg"
done
npm install
```

The overrides keep transitive workspace dependencies on the same verified archives. Keep the lockfile and archives together and use `npm ci` for subsequent installs.

---

## Development & Verification

Run `npm ci` with Node 24. For the vector tests, check out the exact specification commit from `SPEC-PIN.json` and set `VERARED_SPEC_DIR` to its `spec/` directory (the default expects a sibling checkout). Run the build before the boundary guard and tests.

| Gate | Evidence |
|---|---|
| `npm run build` | Eight packages compile to ESM and declarations. |
| `npm run check:boundaries` | License, package DAG, host neutrality, Web-API import graphs and exact specification pin. |
| `npm test -- --maxWorkers=2` | Unit, policy and pinned specification vector coverage; live DoH is opt-in. |
| `npm run smoke:tarballs` | An isolated consumer imports all 18 ESM entrypoints and runs CLI conformance. |
| `npm run smoke:types` | All 18 entrypoints and the Gatekeeper consumer compile with strict `NodeNext` from the tarballs. |
| `npm run smoke:runtimes -- --require-deno` | Imports and APW Ed25519 verification on Node 24, Workers and Deno, subject to the runtime matrix. |
| `npm run pack:release` | Eight versioned `.tgz` files and `SHA256SUMS` in a clean output directory; the [tag workflow](./.github/workflows/release.yml) gates and publishes the assets. |

## Gatekeeper integration

Use the root `@verared/trust-layer` verifier with a trusted ingress resolver and a shared `ResolutionBudget` for host-controlled egress. Bind the verified signing key to the reader's DID before calling the bounded identity verifier in `@verared/local-trust`. Admit evidence under the appropriate profile, keep reader scores separate from public site projections in `@verared/reputation`, then evaluate the read policy with `@verared/apw/scoring`. A valid proof or public level alone does not grant access. Keep unavailable verification distinct from invalid credentials; the unsigned-reader rule was not changed by alpha.2.

See the [migration and wiring guide](./docs/MIGRATION-v0.1.0-alpha.2.md) for exact signatures, fail-closed behavior and the B3 decision boundary.

The [accepted B3 ADR](./docs/decisions/ADR-0003-b3-unsigned-readers.md) describes the admission API added after alpha.2. The tag workflow can also publish the verified archives to npm in dependency order and run an isolated registry smoke when `NPM_TOKEN` is configured. To validate packaging and order locally, run `node scripts/publish-npm.mjs --dry-run`.

## Release and integration status

- **Verified:** [rc.1 packages on the public registry](./ROADMAP.md#phase-7--npm-registry-publication), [Gatekeeper/B3 integration in a consumer](./ROADMAP.md#phase-6--gatekeeper-in-real-consumers-and-b3) and [runtime and CLI smoke coverage](./ROADMAP.md#phase-8--runtime-parity-and-cli).
- **Still open:** `0.1.0` publication, broader deployment parity, [independent ML-DSA review](./ROADMAP.md#phase-9--independent-security-and-ml-dsa-review) and the specification's independent conformance milestones. A stable library release does not change the draft specification pin.

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for DCO (`Signed-off-by`) requirements.
