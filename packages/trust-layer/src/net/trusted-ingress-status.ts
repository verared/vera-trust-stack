import type { TrustedIngress } from "./client-ip";

/** Configuration diagnostic only; no request header can claim trust or WAF coverage. */
export function trustedIngressStatus(ingress?: TrustedIngress) {
  const configured = typeof ingress?.resolveClientIp === "function";
  return {
    configured,
    source: configured ? "injected-resolver" : "unconfigured",
    edgeRulesVerified: false,
  };
}
