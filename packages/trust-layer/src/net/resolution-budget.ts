import {
  RESOLUTION_BUDGET_PROPOSAL,
  RESOLUTION_STAGES,
  ResolutionBudget,
  __resetResolutionHmacDayForTests,
  hashClientIpBuckets,
  normalizeResolutionOrigin,
} from "@verared/net";
import { getClientIp, type TrustedIngress } from "./client-ip";

export {
  RESOLUTION_BUDGET_PROPOSAL,
  RESOLUTION_STAGES,
  ResolutionBudget,
  __resetResolutionHmacDayForTests,
  normalizeResolutionOrigin,
};
export type {
  BudgetRejection,
  ResolutionBudgetOptions,
  ResolutionContext,
  ResolutionStage,
} from "@verared/net";

export interface TrustedClientContext {
  ingress?: TrustedIngress;
  secret?: string;
  previousSecret?: string;
  now?: number;
}

/**
 * Hashes only host-resolved IPs. Without trusted ingress, use a shared unknown bucket.
 */
export async function resolutionClientBuckets(
  request: Request,
  context: TrustedClientContext = {},
): Promise<string[]> {
  const ip = getClientIp(request, context.ingress) ?? undefined;
  return hashClientIpBuckets(ip, {
    secret: context.secret,
    previousSecret: context.previousSecret,
    now: context.now,
  });
}

export async function resolutionClientBucket(
  request: Request,
  context: TrustedClientContext = {},
): Promise<string> {
  return (await resolutionClientBuckets(request, context))[0];
}
