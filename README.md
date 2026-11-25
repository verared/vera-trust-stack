# Vera Trust Stack (`@verared/*`)

Open-source TypeScript/ESM reference implementation of the **Vera Trust Stack** — **APW**, **Local Trust Protocol (LTP)**, **SVRI/HSVR**, neutral **Trust Layer**, **Cloud Images**, and **ATProto Identity** — published under the **Apache License 2.0**.

- **Author:** Gerardo Loyola
- **License:** [Apache-2.0](./LICENSE) (every package includes its own `LICENSE` file)
- **Pinned Specification:** [`SPEC-PIN.json`](./SPEC-PIN.json) → [`verared/vera-trust-spec`](https://github.com/verared/vera-trust-spec) (`v0.1.0-draft.1`, commit `7787966a38fb08ceb509df295ee814ba93af4dec`, G1 corpus digest `wNQ9gG2BPs8JO1wPsiPgoz265juDT-TCjuGMbTzSYXA`)

---

## Packages (`0.1.0-alpha.1`)

| Layer | Package | Directory | Subpath Exports | Runtime |
|---|---|---|---|---|
| **L0-net** | `@verared/net` | [`packages/net`](./packages/net) | `.` | 100% Web-API pure (`0` `node:*`) |
| **L1** | `@verared/apw` | [`packages/apw-resolver`](./packages/apw-resolver) | `.` (Web-API pure), `./full`, `./resolver`, `./did-apw`, `./scoring`, `./federation` | Web-API / Node 24 |
| **L1** | `@verared/local-trust` | [`packages/ltp-engine`](./packages/ltp-engine) | `.` | Node 24 |
| **L1** | `@verared/reputation` | [`packages/ltp-reputation`](./packages/ltp-reputation) | `.` | Web-API / Node 24 |
| **L2** | `@verared/trust-layer` | [`packages/trust-layer`](./packages/trust-layer) | `.`, `./site-trust`, `./policy`, `./billing`, `./ledger`, `./net` | Web-API / Node 24 |
| **L2** | `@verared/cloud-images` | [`packages/cloud-images`](./packages/cloud-images) | `.` | Web-API / Node 24 |
| **L2** | `@verared/identity-atproto` | [`packages/identity-atproto`](./packages/identity-atproto) | `.` | Web-API / Node 24 |

All 7 packages compile to `dist/` (ESM `.js` + TypeScript `.d.ts`) without CMS or database-driver dependencies. Hosts supply storage via TypeScript ports and can use the `InMemory*` stores for local use.

---

## Consuming via GitHub Release Tarballs (No Registry Token Required)

During Wave 2, `@verared/*` packages are distributed as immutable `.tgz` tarballs attached to GitHub Releases. Any external consumer can install them via `npm ci` or Docker without npm registry authentication using the `dependencies` + `overrides` pattern:

```json
{
  "dependencies": {
    "@verared/net": "https://github.com/verared/vera-trust-stack/releases/download/v0.1.0-alpha.1/verared-net-0.1.0-alpha.1.tgz",
    "@verared/apw": "https://github.com/verared/vera-trust-stack/releases/download/v0.1.0-alpha.1/verared-apw-0.1.0-alpha.1.tgz",
    "@verared/local-trust": "https://github.com/verared/vera-trust-stack/releases/download/v0.1.0-alpha.1/verared-local-trust-0.1.0-alpha.1.tgz",
    "@verared/reputation": "https://github.com/verared/vera-trust-stack/releases/download/v0.1.0-alpha.1/verared-reputation-0.1.0-alpha.1.tgz",
    "@verared/trust-layer": "https://github.com/verared/vera-trust-stack/releases/download/v0.1.0-alpha.1/verared-trust-layer-0.1.0-alpha.1.tgz",
    "@verared/cloud-images": "https://github.com/verared/vera-trust-stack/releases/download/v0.1.0-alpha.1/verared-cloud-images-0.1.0-alpha.1.tgz",
    "@verared/identity-atproto": "https://github.com/verared/vera-trust-stack/releases/download/v0.1.0-alpha.1/verared-identity-atproto-0.1.0-alpha.1.tgz"
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

```bash
npm ci
npm run build             # Compiles all 7 packages to dist/ (ESM .js + .d.ts)
npm run check:boundaries  # Licenses, DAG, host neutrality, runtime imports, SPEC-PIN
npm test                  # Vitest unit + specification vector conformance suite
npm run smoke:tarballs    # Packs all 7 .tgz and verifies external ESM consumption
```

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for DCO (`Signed-off-by`) requirements.
