#!/usr/bin/env node
/**
 * Local CPU miner. Hashes on this process and submits to a node over HTTPS.
 * Do not run hashing on the shared Cloudflare Worker account.
 */
import { headerHash, type Block } from "./block.ts";
import { isAddress } from "./address.ts";
import { mineBlock } from "./mine.ts";

const endpoint = (process.env.NHC_NODE || "http://127.0.0.1:18732").replace(/\/$/, "");
const payout = process.env.NHC_PAYOUT || process.argv[2] || "";
const token = process.env.NHC_OPERATOR_TOKEN || "";
const rounds = Number(process.env.NHC_BLOCKS || 1);

if (!isAddress(payout)) {
  console.error("Set NHC_PAYOUT to an nhc1… address");
  process.exit(1);
}

async function once(): Promise<void> {
  const headers: Record<string, string> = {};
  if (token) headers["x-operator-token"] = token;
  const workRes = await fetch(`${endpoint}/work?payout=${payout}`, { headers });
  const work = (await workRes.json()) as { error?: string; block: Block; height: number };
  if (!workRes.ok) throw new Error(work.error || `work ${workRes.status}`);
  const mined = await mineBlock(work.block);
  const submit = await fetch(`${endpoint}/submit`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ block: mined }),
  });
  const body = (await submit.json()) as { error?: string; hash?: string; height?: number };
  if (!submit.ok) throw new Error(body.error || `submit ${submit.status}`);
  console.log(`height ${body.height} ${body.hash ?? headerHash(mined.header)}`);
}

for (let i = 0; i < rounds; i++) {
  await once();
}
