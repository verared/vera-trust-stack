import { verifyWebBotAuthRequest, type VerifyWebBotAuthOptions } from '@verared/trust-layer';
import { ResolutionBudget, resolutionClientBuckets, type TrustedIngress } from '@verared/trust-layer/net';
import { runComposed, type ComposedInput } from '@verared/local-trust';
import { projectSvri, type SvriCounts, type SvriDimension } from '@verared/reputation';
import { resolveApwIdentity } from '@verared/apw';
import { D1SiteIdentityStore, type D1Database } from '@verared/apw/did-apw';
import { evaluatePolicy, type DimensionScore, type ReadPolicy } from '@verared/apw/scoring';

interface Host {
  budget: ResolutionBudget;
  ingress: TrustedIngress;
  secret: string;
  nonceStore: NonNullable<VerifyWebBotAuthOptions['nonceStore']>;
  identityInput(request: Request, operator: string, clientBucket: readonly string[], budget: ResolutionBudget): Promise<ComposedInput>;
  /** Must check the host's verified binding between the signer and the reader DID. */
  boundReaderDid(key: NonNullable<Awaited<ReturnType<typeof verifyWebBotAuthRequest>>['keyRecord']>): Promise<string | null>;
  admittedReaderScores(subject: string): Promise<ReadonlyMap<string, DimensionScore>>;
  admittedSiteEvidence(request: Request): Promise<{ counts: SvriCounts; dimensions: readonly SvriDimension[] }>;
}

export async function read(request: Request, host: Host, policy: ReadPolicy): Promise<Response> {
  const options = { ingress: host.ingress, secret: host.secret, budget: host.budget };
  const auth = await verifyWebBotAuthRequest(request, { nonceStore: host.nonceStore, resolutionBudget: options });
  if (!auth.verified || !auth.keyRecord) {
    return new Response(null, {
      status: auth.status ?? (auth.failureType === 'unavailable' ? 503 : 401),
      headers: auth.retryAfterSeconds === undefined ? undefined : { 'Retry-After': String(auth.retryAfterSeconds) },
    });
  }
  const readerDid = await host.boundReaderDid(auth.keyRecord);
  if (!readerDid) return new Response(null, { status: 403 });
  const buckets = await resolutionClientBuckets(request, options);
  const input = await host.identityInput(request, auth.keyRecord.operator, buckets, host.budget);
  if (input.subject !== readerDid) return new Response(null, { status: 403 });
  const { result } = await runComposed(input);
  if (result.identity !== 'verified' || result.history !== 'verified' || !result.proofAccepted) {
    return new Response(null, { status: result.identity === 'unavailable' ? 503 : 403 });
  }
  const scores = await host.admittedReaderScores(readerDid);
  const decision = evaluatePolicy(policy, { kind: 'apw_verified', did: readerDid, scores });
  if (decision.allow === false) return new Response(null, { status: Number(decision.status) });
  const { dimensions, counts } = await host.admittedSiteEvidence(request);
  return Response.json(projectSvri(dimensions, counts));
}

export const discoverIdentity = resolveApwIdentity;
export const openIdentityStore = (db: D1Database, encryptionKey: string) => new D1SiteIdentityStore(db, { encryptionKey });
