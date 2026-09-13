import { randomBytes } from "node:crypto";
import { secretToAddress } from "./address.ts";
import { assembleBlock, headerHash, type Block } from "./block.ts";
import { GENESIS_TIME, INITIAL_BITS, ZERO_HASH } from "./constants.ts";
import { bytesToHex } from "./encoding.ts";
import { hashMeetsTarget } from "./pow.ts";
import { clampSubsidy } from "./subsidy.ts";
import { makeCoinbase } from "./tx.ts";
import { applyBlock, emptyState, type ChainState } from "./chain.ts";
import { serializeHeader } from "./block.ts";
import { blake3Hex } from "./hash.ts";

export async function mineBlock(block: Block, maxNonce = 50_000_000n): Promise<Block> {
  const header = { ...block.header };
  for (let nonce = 0n; nonce < maxNonce; nonce++) {
    header.nonce = nonce.toString();
    const hash = blake3Hex(serializeHeader(header));
    if (hashMeetsTarget(hash, header.bits)) {
      return { header, txs: block.txs };
    }
  }
  throw new Error("nonce space exhausted");
}

export async function buildGenesis(payout: string): Promise<{ block: Block; hash: string; state: ChainState }> {
  const subsidy = clampSubsidy(0, 0n);
  const coinbase = makeCoinbase(payout, subsidy, 0, "NodeHashCoin / MoltAd / nodehashcoin.com");
  const assembled = assembleBlock({
    prevHash: ZERO_HASH,
    timestamp: GENESIS_TIME,
    bits: INITIAL_BITS,
    txs: [coinbase],
  });
  const block = await mineBlock(assembled);
  const state = await applyBlock(emptyState(), block);
  return { block, hash: headerHash(block.header), state };
}

export async function randomPayout(): Promise<{ secret: string; address: string }> {
  const secret = bytesToHex(randomBytes(32));
  return { secret, address: await secretToAddress(secret) };
}
