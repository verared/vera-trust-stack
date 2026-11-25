# `@verared/cli`

Node 24 CLI for the Vera Trust Stack. It has two commands:

- `verared verify <domain> [--json]`: verifies the APW binding between DNS TXT and the DID document. This does not certify the site's claims or verify full history.
- `verared conformance <vectors-dir>`: executes the APW or SVRI machine-readable cases selected by that directory's manifest against public APW exports. A passing run covers the executable cases, not formats or cases absent from the manifest (such as V-06 from the APW minimum).

Exit codes: `0` success, `1` verification failure or a failed/unsupported case, `2` invalid usage or unreadable/invalid fixtures. `verared --help` lists usage.
