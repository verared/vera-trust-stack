# Integrar Vera Trust Layer

## Ingress y Web Bot Auth

El host debe inyectar `TrustedIngress.resolveClientIp` desde `@verared/trust-layer/net` para usar la IP del cliente. El resolver consulta datos autenticados del transporte o del edge. No leas cabeceras de una solicitud pública: si usas una cabecera interna, impide que se pueda acceder directamente al origen y haz que el proxy elimine el valor entrante antes de escribir el suyo. Sin resolver, `getClientIp` devuelve `null` y el presupuesto usa el bucket compartido `unknown`. Un diagnóstico `configured` no verifica las reglas del proxy.

Para habilitar el presupuesto de Web Bot Auth, pasa `resolutionBudget: { ingress, secret, previousSecret? }` a `verifyWebBotAuthRequest` de `@verared/trust-layer`. El secreto debe tener al menos 32 caracteres; una configuración incompleta devuelve 503 antes de consultar el directorio. Configura `reservedOrigins` con un array y comparte el almacenamiento de nonces entre réplicas mediante `nonceStore` o `createNonceStore`. El store predeterminado solo vive en el proceso.

## Política, ledger y almacenamiento

- Sirve la política en `/.well-known/vera-content-policy.json` y configura `robots.txt` para apuntar a ella. Actualiza ambos si migras una instalación anterior.
- La biblioteca no registra rutas HTTP: el host puede publicar el ledger de uso en `/.well-known/vera-usage-log.json` e implementar su autorización.
- Inyecta los stores persistentes desde el host. Las implementaciones en memoria son útiles para desarrollo, pero no persisten entre reinicios ni comparten datos entre réplicas.
- La consulta local de reputación en ATProto requiere ambas factories, `createSiteIdentityStore` y `createSiteTrustScoreStore`, en `AtprotoReputationDeps`. Captura las conexiones en las closures. Sin factories, la consulta de confianza usa el endpoint público del sitio.
