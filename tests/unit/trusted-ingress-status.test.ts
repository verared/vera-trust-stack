import { expect, it } from "vitest";
import { trustedIngressStatus } from "../../packages/trust-layer/src/net/trusted-ingress-status";
import { getClientIp } from "../../packages/trust-layer/src/net/client-ip";

it("reports server-configured ingress without asserting verified edge/WAF protection", () => {
  expect(trustedIngressStatus()).toEqual({ configured: false, source: "unconfigured", edgeRulesVerified: false });
  expect(trustedIngressStatus({ resolveClientIp: () => null })).toEqual({ configured: true, source: "injected-resolver", edgeRulesVerified: false });
});

it("ignores request headers without trusted ingress, including on resolver failure", () => {
  const request = new Request("https://site.example/", { headers: { "CF-Connecting-IP": "192.0.2.1", "X-Forwarded-For": "192.0.2.2" } });
  expect(getClientIp(request)).toBeNull();
  expect(getClientIp(request, { resolveClientIp: () => { throw new Error("no edge metadata"); } })).toBeNull();
  expect(getClientIp(request, { resolveClientIp: () => " 192.0.2.3 " })).toBe("192.0.2.3");
});
