# Vera Trust Stack roadmap

The current release baseline is Node 24 and the draft recorded in [`SPEC-PIN.json`](./SPEC-PIN.json). The items below are planned implementation work, not support claims.

| Milestone | Evidence needed |
|---|---|
| Workers and Deno | Test actual runtime behavior per public entrypoint and document supported surfaces and their limits. Keep `@verared/net` and the `@verared/apw` root export free of Node built-ins. |
| `@verared/cli` | Define the initial command and input/output contracts. Verify packaging and invocation from a clean external install before publishing. |
| `@noble/post-quantum` | Review the pinned dependency and its Web Bot Auth integration. Record the reviewed versions, algorithm coverage, interoperability results, and findings before making audit claims. |
| `@verared/cloud-images`: R2 and formats | Verify an R2 adapter through the storage interface and publish a format matrix backed by signing and verification fixtures. Keep host credentials and deployment configuration out of the core package. |

The [Vera Trust Spec roadmap](https://github.com/verared/vera-trust-spec/blob/main/ROADMAP.md) owns S4, S6, G5, second-operator and independent-implementation evidence, and R-05 activation criteria. Stack CI and package releases do not set those milestones' status.
