# Contributing to `verared/vera-trust-stack`

Thank you for contributing to the **Vera Trust Stack**.

## License and Developer Certificate of Origin (DCO)

- All packages in this repository are licensed under **Apache-2.0** (`LICENSE`).
- Every commit must include a Developer Certificate of Origin (`Signed-off-by`) trailer (`https://developercertificate.org/`):

```bash
git commit -s -m "feat(apw): describe your change"
```

## Architectural Boundaries

1. **Zero CMS / SQLite coupling:** packages must never depend on SQLite drivers, `better-sqlite3`, or host-specific frameworks. Persistence is injected via ports (`InMemory*` implementations live here; host adapters live in consumer nodes).
2. **Web-API purity:** `@verared/net` and the `.` entry point of `@verared/apw` must contain zero `node:*` imports.
3. **Strict public exports:** cross-package imports must use declared `@verared/*` entry points only (no deep `packages/*/src/` imports, no cycles).
4. **Specification pin:** vector and schema expectations are pinned via [`SPEC-PIN.json`](./SPEC-PIN.json) against [`verared/vera-trust-spec`](https://github.com/verared/vera-trust-spec).

## Local Checks

```bash
npm run build
npm run check:boundaries
npm test
npm run smoke:tarballs
```
