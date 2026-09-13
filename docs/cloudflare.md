# Cloudflare

The public node package is the same TypeScript on every host. On Cloudflare:

- Worker = HTTPS gateway + JSON RPC
- Durable Object / D1 / R2 = headers and UTXO
- **Do not** hash nonces in the Worker. Miners are browsers or Node.js processes.

Deploy a dedicated Worker name. Never overwrite `junedeal`, `tokshoppe`, `edsbargains`, or `moltad`.
