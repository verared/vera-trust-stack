export interface TrustedIngress {
  /** Supplied by the host; resolve only authenticated transport or edge metadata. */
  resolveClientIp(request: Request): string | null | undefined;
}

export function getClientIp(request: Request, ingress?: TrustedIngress): string | null {
  try {
    return ingress?.resolveClientIp(request)?.trim() || null;
  } catch {
    return null;
  }
}
