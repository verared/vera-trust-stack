# ADR 0003 — B3 admission of unsigned automated readers

**Accepted for the Trust Layer admission API.** The host supplies a trusted route classification and its effective `ai_input` policy to `admitAutomatedRead` from `@verared/trust-layer/policy`.

| Policy | Public / absent | Governed / absent | Invalid (either route) | Valid (either route) |
|---|---|---|---|---|
| `allow` | Anonymous read | 403 | 401 | Continue as verified |
| `block` | 403 | 403 | 401 | 403 |
| `charge` | 402 | 402 | 401 | Continue as verified; settlement still required |

All three signature headers must be absent for the anonymous path. Partial, malformed, forged or replayed credentials never downgrade to anonymous. Operational budget exhaustion or unavailable verification preserves a `429`/`503` denial and `Retry-After` when supplied.

An anonymous read has `verified: false`, with no identity attribution, reader-conduct record, or charge. On a verified result the host still applies governed-route authorization and settlement before serving content. This gate classifies requests the host has already sent through its automated-read policy; it does not detect all bots or change protocol identifiers.
