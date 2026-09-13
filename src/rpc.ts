#!/usr/bin/env node
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { applyBlock, emptyState, utxoKey, workTemplate, type ChainState } from "./chain.ts";
import { headerHash, type Block } from "./block.ts";
import { EPOCH0_LAST } from "./constants.ts";
import { chainStatus } from "./status.ts";
import { isAddress } from "./address.ts";
import { type Transaction } from "./tx.ts";

export type NodeStore = {
  state: ChainState;
  blocks: Block[];
  mempool: Transaction[];
  miningOpen: boolean;
};

export function createStore(): NodeStore {
  return { state: emptyState(), blocks: [], mempool: [], miningOpen: false };
}

export async function submitBlock(store: NodeStore, block: Block): Promise<{ hash: string; height: number }> {
  const next = await applyBlock(store.state, block);
  store.state = next;
  store.blocks.push(block);
  if (next.height >= EPOCH0_LAST) store.miningOpen = true;
  return { hash: headerHash(block.header), height: next.height };
}

function json(res: ServerResponse, body: unknown, status = 200): void {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

export function statusPayload(store: NodeStore) {
  return chainStatus(store.state, store.miningOpen);
}

export function addressUtxos(store: NodeStore, address: string): { amount: string; utxos: typeof store.state.utxos[string][] } {
  const utxos = Object.values(store.state.utxos).filter((u) => u.address === address);
  const amount = utxos.reduce((a, u) => a + BigInt(u.amount), 0n).toString();
  return { address, amount, utxos };
}

export function createRpcHandler(store: NodeStore, opts: { operatorToken?: string } = {}) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || "/", "http://node.local");
    const path = url.pathname.replace(/\/+$/, "") || "/";
    res.setHeader("access-control-allow-origin", "*");
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "access-control-allow-methods": "GET,POST,OPTIONS",
        "access-control-allow-headers": "content-type,x-operator-token",
      });
      res.end();
      return;
    }

    try {
      if (path === "/status" || path === "/") return json(res, statusPayload(store));

      if (path === "/work" && req.method === "GET") {
        const payout = url.searchParams.get("payout") || "";
        if (!isAddress(payout)) return json(res, { error: "payout address required" }, 400);
        const token = String(req.headers["x-operator-token"] || "");
        if (!store.miningOpen && token !== opts.operatorToken) {
          return json(res, { error: "mining not open" }, 403);
        }
        const block = workTemplate(store.state, payout, store.mempool);
        return json(res, { height: store.state.height + 1, block });
      }

      if (path === "/submit" && req.method === "POST") {
        const body = JSON.parse(await readBody(req)) as { block: Block };
        const token = String(req.headers["x-operator-token"] || "");
        if (!store.miningOpen && token !== opts.operatorToken) {
          return json(res, { error: "mining not open" }, 403);
        }
        const result = await submitBlock(store, body.block);
        return json(res, result);
      }

      if (path === "/operator/open" && req.method === "POST") {
        if (String(req.headers["x-operator-token"] || "") !== opts.operatorToken) {
          return json(res, { error: "unauthorized" }, 401);
        }
        store.miningOpen = true;
        return json(res, { miningOpen: true, height: store.state.height });
      }

      if (path.startsWith("/block/") && req.method === "GET") {
        const id = path.slice("/block/".length);
        const byHeight = /^\d+$/.test(id) ? store.blocks[Number(id)] : undefined;
        const byHash = store.blocks.find((b) => headerHash(b.header) === id);
        const block = byHeight ?? byHash;
        if (!block) return json(res, { error: "not found" }, 404);
        return json(res, { hash: headerHash(block.header), block });
      }

      if (path.startsWith("/address/") && req.method === "GET") {
        const address = path.slice("/address/".length);
        if (!isAddress(address)) return json(res, { error: "bad address" }, 400);
        return json(res, addressUtxos(store, address));
      }

      if (path === "/tx" && req.method === "POST") {
        const body = JSON.parse(await readBody(req)) as { tx: Transaction };
        if (!body.tx || body.tx.coinbase) return json(res, { error: "bad tx" }, 400);
        store.mempool.push(body.tx);
        return json(res, { ok: true, queued: store.mempool.length });
      }

      if (path === "/blocks" && req.method === "GET") {
        const n = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 20)));
        const tip = store.blocks.slice(-n).reverse().map((b, i) => ({
          height: store.state.height - i,
          hash: headerHash(b.header),
          txs: b.txs.length,
          timestamp: b.header.timestamp,
        }));
        return json(res, { blocks: tip });
      }

      json(res, { error: "not found" }, 404);
    } catch (err) {
      json(res, { error: err instanceof Error ? err.message : "error" }, 400);
    }
  };
}

export function listen(store: NodeStore, port = 18732, operatorToken?: string) {
  const server = createServer(createRpcHandler(store, { operatorToken }));
  server.listen(port, () => {
    console.log(`NHC node http://127.0.0.1:${port} height=${store.state.height}`);
  });
  return server;
}

void utxoKey;
