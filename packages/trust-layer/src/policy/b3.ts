import { verifyWebBotAuthRequest, type VerifyResult, type VerifyWebBotAuthOptions } from '../webbotauth/verify';
import type { AccessMode } from './manifest-schema';

export interface B3Policy {
  /** Host-resolved route classification. Never derive this from request headers. */
  route: 'public' | 'governed';
  aiInput: AccessMode;
}

export type B3Decision =
  | { outcome: 'anonymous'; verified: false; attributeIdentity: false; recordReaderConduct: false; charge: false }
  | { outcome: 'verified'; verified: true; authentication: VerifyResult & { verified: true } }
  | { outcome: 'deny'; status: 401 | 402 | 403 | 429 | 503; reason: string; retryAfterSeconds?: number };

/** Admission for automated reads. A verified result still needs host authorization and settlement. */
export async function admitAutomatedRead(
  request: Request,
  policy: B3Policy,
  options?: VerifyWebBotAuthOptions,
): Promise<B3Decision> {
  const hasSignatureMaterial = ['Signature-Agent', 'Signature-Input', 'Signature'].some((name) => request.headers.has(name));
  if (!hasSignatureMaterial) {
    if (policy.route === 'public' && policy.aiInput === 'allow') {
      return { outcome: 'anonymous', verified: false, attributeIdentity: false, recordReaderConduct: false, charge: false };
    }
    return { outcome: 'deny', status: policy.aiInput === 'charge' ? 402 : 403, reason: 'unsigned_automated_request' };
  }

  const auth = await verifyWebBotAuthRequest(request, options);
  if (!auth.verified) {
    const status = auth.status === 429 ? 429 : auth.status === 503 || auth.failureType === 'unavailable' ? 503 : 401;
    return { outcome: 'deny', status, reason: auth.reason ?? 'signature_not_verified', retryAfterSeconds: auth.retryAfterSeconds };
  }
  if (policy.aiInput === 'block') return { outcome: 'deny', status: 403, reason: 'ai_input_blocked' };
  return { outcome: 'verified', verified: true, authentication: { ...auth, verified: true } };
}
