// Genera un robots.txt que incluye Content Signals a partir del manifiesto
// de políticas del sitio, para que crawlers que aún no soportan el
// manifiesto JSON reciban una señal legible en el
// formato ya estandarizado por Cloudflare/IETF AIPREF.
//
// El host puede usar esta función como fuente de su robots.txt.
//   - disallow: rutas a bloquear (ej. "/admin/"), van antes de Allow: /.
//   - sitemapUrl: URL absoluta del sitemap (respeta el base de Astro).
//   - llmsTxtUrl: agrega un comentario con el indice para LLMs.
//   - policyUrl: URL absoluta del manifiesto en el comentario de cabecera.

import type { ContentPolicyManifest, AccessMode } from "./manifest-schema";

export interface RobotsTxtOptions {
  disallow?: string[];
  sitemapUrl?: string;
  llmsTxtUrl?: string;
  policyUrl?: string;
}

function toYesNo(access: AccessMode): "yes" | "no" {
  return access === "block" ? "no" : "yes";
}

export function generateRobotsTxt(manifest: ContentPolicyManifest, options: RobotsTxtOptions = {}): string {
  const { search, ai_input, ai_train } = manifest.policies;
  const policyUrl = options.policyUrl ?? "/.well-known/vera-content-policy.json";
  const llms = options.llmsTxtUrl ? `# Indice para LLMs (llmstxt.org): ${options.llmsTxtUrl}\n` : "";
  const disallow = (options.disallow ?? []).map((path) => `Disallow: ${path}\n`).join("");
  const sitemap = options.sitemapUrl ?? `${manifest.site}/sitemap.xml`;

  return `# Generado automáticamente por Vera Trust Layer v${manifest.version}
# Politica legible por humanos: ver ${policyUrl}
# para condiciones de pago y excepciones por operador.
${llms}
User-agent: *
${disallow}Allow: /

# Content Signals (compatible con el estandar de Cloudflare / IETF AIPREF)
Content-Signal: search=${toYesNo(search.access)}, ai-input=${toYesNo(ai_input.access)}, ai-train=${toYesNo(ai_train.access)}

Sitemap: ${sitemap}
`;
}
