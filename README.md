# NodeHashCoin node

TypeScript validation node for **NodeHashCoin (NHC)**. Consensus hash is **BLAKE3** (not SHA-256). Same package runs on Cloudflare Workers, AWS, GCP, or a VPS.

Public repository: this folder is published as [`chrisgu/nodehashcoin-node`](https://github.com/chrisgu/nodehashcoin-node).

## Requirements

- Node.js 22+
- For Cloudflare: Wrangler 4

## Quick start (local)

```bash
npm install
npm test
npm run genesis
npm start
```

Default RPC: `http://127.0.0.1:18732`

| Method | Path | Notes |
|--------|------|--------|
| GET | `/status` | height, tip, bits, issued supply |
| GET | `/work?payout=nhc1…` | block template |
| POST | `/submit` | `{ "block": … }` |
| GET | `/block/:height-or-hash` | one block |
| GET | `/address/:nhc1…` | UTXOs |
| GET | `/blocks?limit=20` | recent headers |

CPU mining is a **local Node process** that talks to the node over HTTP. Do not hash inside the Cloudflare Worker.

```bash
NHC_PAYOUT=nhc1… NHC_NODE=http://127.0.0.1:18732 npm run mine
```

`npm run genesis` writes a deterministic-format genesis block (`genesis.json`) using BLAKE3 PoW.

## Protocol (short)

- Max supply: 21,000,000 NHC (8 decimals)
- Hash: BLAKE3-256 over a versioned header (64-bit nonce + extraNonce)
- Signatures: Ed25519
- Model: UTXO
- Addresses: `nhc1` + 20-byte BLAKE3 of the pubkey
- After the opening blocks, subsidy is scheduled for **about ten years** of 60-second blocks with **Bitcoin-style halvings** (every 2.5 years / 1,314,900 blocks). Launch proof-of-work is easy (difficulty 1); retarget every 20 blocks so the target tightens as BLAKE3 hash rate grows from browsers/CPU toward AI-written GPU kernels and later specialized silicon.

## Cloudflare Workers

This package is the **validation + RPC** logic. The branded gateway at nodehashcoin.com hosts it as a Worker + Durable Object (index only — no Worker-side hashing farm).

1. Copy this package into a Worker project (or depend on it from the private master workspace).
2. Bind a Durable Object for headers/UTXO (see `apps/site` in the private master, or roll your own using `applyBlock` / `workTemplate`).
3. `npx wrangler deploy` on a **dedicated** Worker name. Do not deploy over unrelated sites.

```toml
name = "nhc-node"
main = "src/worker.ts"
compatibility_date = "2026-08-01"
compatibility_flags = ["nodejs_compat"]
```

`src/worker.ts` can import `createStore`-equivalent DO code using the same `applyBlock` API as the Node HTTP server in `src/rpc.ts`.

## AWS

Run the HTTP node on a small instance or ECS Fargate. Hashing stays on miner processes, not on the API task if you want to isolate CPU.

```bash
# Amazon Linux 2023 / Ubuntu on EC2
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
git clone https://github.com/chrisgu/nodehashcoin-node.git
cd nodehashcoin-node
npm install
NHC_PORT=18732 systemd-run --user --unit nhc-node npm start
```

Docker:

```dockerfile
FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json* ./
COPY src ./src
COPY test ./test
RUN npm install
ENV NHC_PORT=18732
EXPOSE 18732
CMD ["npx", "tsx", "src/cli.ts"]
```

Put an ALB or nginx TLS terminator in front. Open only `/status`, `/work`, `/submit`, `/block`, `/address`, `/blocks`.

## GCP

Cloud Run (HTTP node) or a Compute Engine VM. Same container as AWS.

```bash
gcloud run deploy nhc-node \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --cpu 1 --memory 512Mi
```

Miners (GCE, Cloud Batch, or your laptop) set `NHC_NODE` to the Cloud Run HTTPS URL.

## VPS / systemd

```ini
[Unit]
Description=NodeHashCoin node
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/nodehashcoin-node
ExecStart=/usr/bin/npx tsx src/cli.ts
Environment=NHC_PORT=18732
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

## Tests

```bash
npm test
```

## License

UNLICENSED / source-available for running a public NHC node. Branding for nodehashcoin.com stays with MoltAd.
