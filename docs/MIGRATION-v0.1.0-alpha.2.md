# Migration: v0.1.0-alpha.1 → v0.1.0-alpha.2

Upgrade all seven packages as a set. The spec pin stays at `v0.1.0-draft.1` (`7787966a38fb08ceb509df295ee814ba93af4dec`). The changes below include the host-neutral contracts introduced since the alpha.1 tag.

## Host integration changes

| Area | Consumer action |
|---|---|
| Trusted ingress | Use `TrustedIngress` from `@verared/trust-layer/net`: `resolveClientIp(request: Request): string \| null \| undefined`. Derive it from authenticated transport metadata or a trusted edge that overwrites incoming forwarding headers. Without a resolver, `getClientIp` returns `null` and `resolutionClientBuckets` uses `unknown`. |
| Web Bot Auth | Import `verifyWebBotAuthRequest(request, options?)` from the **root** `@verared/trust-layer`. Replace the old host env bag with typed `reservedOrigins`, `nonceStore` or `createNonceStore: () => Promise<WebBotAuthNonceStore>`, and `resolutionBudget: { secret, previousSecret?, ingress, budget? }`. Inject `budget: ResolutionBudget` to share quotas with host-controlled egress. Without `budget` the verifier uses its existing process-local default. |
| Fail-closed behavior | For requests that reach directory resolution with the budget enabled, a missing ingress resolver or invalid current/previous secret returns `503 resolution_budget_misconfigured` with `retryAfterSeconds: 1`, before fetching. Missing signature headers are rejected earlier. A configured resolver that cannot determine the client's IP uses `unknown`; it never falls back to an untrusted header. |
| Site-trust verifier | `@verared/trust-layer/site-trust` also exports `verifyWebBotAuthRequest(request, kv?)`, for the site-trust surface. It does not use the root verifier's shared-budget configuration. |
| APW keys and ATProto storage | Construct an APW identity store from `@verared/apw/did-apw` with `{ encryptionKey }`: a base64 AES key supplied by the host, required to write or decrypt private keys. `D1Database` and `SiteIdentityStoreOptions` are exported from that subpath. For `buildAtprotoReputation(handle, deps?)` in `@verared/identity-atproto`, inject `createSiteIdentityStore: () => Promise<…>` and `createSiteTrustScoreStore: () => Promise<…>` together for local lookup; capture the storage connection in the factories. |

## B3 / ADR 0003: missing and invalid signatures

**No behavior changes in this release.** The root verifier returns `verified: false` with `missing_signature_agent_header` or `missing_signature_headers` on missing signature material; it doesn't decide `ai_input` or grant public access. A partial or malformed signing attempt must not be treated as an unsigned request eligible for a fallback. `isPublicBotRoute` is a classifier, not an authorization decision.

The historical host rule reported in the [runtime integration proposal](https://github.com/verared/vera-trust-spec/blob/03728bc88e123e177ff4d0053bd93366f478231e/architecture/ltp-runtime-integration-proposal.md#6-b3-behavior-and-migration) rejects unsigned bot-like traffic before policy, even when `ai_input=allow`. Keep that rule unless ADR 0003 explicitly approves an exception. The following matrix is the recommended **optional future policy**, for bot-like requests sent through the policy gate; existing routing outside that gate is unchanged.

| `ai_input` | Public, signature absent | Public, signature invalid | Governed, signature absent | Governed, signature invalid |
|---|---|---|---|---|
| `allow` | Anonymous read only on explicitly approved public routes | Reject | Reject | Reject |
| `block` | Reject | Reject | Reject | Reject |
| `charge` | Reject without charging | Reject without charging | Reject without charging | Reject without charging |

An anonymous read grants no identity, reputation credit or penalty, access to governed data, or billing. Do not silently downgrade a bad signature to anonymous. The host must distinguish unavailable verification (`429`/`503`, with `Retry-After` when supplied) from invalid authentication; transport failures are not misconduct.

## Gatekeeper wiring

The [NodeNext consumer fixture](../scripts/fixtures/gatekeeper.mts) compiles against the seven packaged tarballs. The host supplies its routing, stores, signer binding and evidence-admission implementation.

1. **Budget and authentication.** Keep one `ResolutionBudget` per host instance; use the same `TrustedIngress`, secret and rotation configuration with the root verifier and `resolutionClientBuckets`. Charge host outbound requests through that same budget, with a trusted client bucket and configured origin. Web Bot Auth's directory cache and per-origin single-flight are process-local: a cached or coalesced result may use no additional outbound allowance. The shared budget is not a cross-instance quota or an inbound request limiter.
2. **Identity.** Bind the verified Web Bot Auth key/operator to the intended reader DID using the host's trusted binding. Use `@verared/local-trust`'s `runComposed(input: ComposedInput)` with the approved profile, host policy, bounded transport and caller-supplied state and clocks. The transport must account for host egress using the shared window budget where applicable, while preserving G2/G3 DNS, TLS, pinning, byte and time checks. `runComposed` maintains a separate per-operation `ResourceBudget`; its `proofAccepted` confirms a proof, not a resource grant or evidence admission.
3. **Admitted evidence → reputation.** Validate provenance, issuer and subject binding, signatures, freshness, and the relevant profile before scoring. Use `@verared/apw/scoring` (`loadReaderConduct` for reader evidence; `scoreSubject` for dimension scores) under host-controlled egress and evidence policy. Pass admitted **site** `SvriDimension[]` and `SvriCounts` to `@verared/reputation.projectSvri` for a public projection. Keep reader scores separate. A projected level or score never grants access or activates R-05.
4. **Policy → response.** Use `evaluatePolicy(policy: ReadPolicy, reader: ReaderState)` from `@verared/apw/scoring` with the verified DID and admitted reader scores. Return the policy's denial status or continue with the authorized route. Keep public projections and governed fields separate. Preserve `429`/`503` from the egress budget and translate missing or invalid credentials according to the host's approved B3 policy.
