import { GENESIS_MESSAGE, VERSION, ZERO_HASH } from "./constants.ts";
import { concat, hexToBytes, u32le, u64le } from "./encoding.ts";
import { blake3Hex } from "./hash.ts";
import { hashMeetsTarget } from "./pow.ts";
import { txidOf, type Transaction } from "./tx.ts";

export type BlockHeader = {
  version: number;
  prevHash: string;
  merkleRoot: string;
  timestamp: number;
  bits: number;
  nonce: string;
  extraNonce: number;
};

export type Block = {
  header: BlockHeader;
  txs: Transaction[];
};

export function merkleRoot(txids: string[]): string {
  if (txids.length === 0) return ZERO_HASH;
  let layer = txids.slice();
  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const a = hexToBytes(layer[i]);
      const b = hexToBytes(layer[i + 1] ?? layer[i]);
      next.push(blake3Hex(concat(a, b)));
    }
    layer = next;
  }
  return layer[0];
}

export function serializeHeader(h: BlockHeader): Uint8Array {
  return concat(
    u32le(h.version),
    hexToBytes(h.prevHash),
    hexToBytes(h.merkleRoot),
    u64le(BigInt(h.timestamp)),
    u32le(h.bits >>> 0),
    u64le(BigInt(h.nonce)),
    u32le(h.extraNonce >>> 0),
  );
}

export function headerHash(h: BlockHeader): string {
  return blake3Hex(serializeHeader(h));
}

export function blockMerkle(block: Block): string {
  return merkleRoot(block.txs.map(txidOf));
}

export function headerValidPow(h: BlockHeader): boolean {
  return hashMeetsTarget(headerHash(h), h.bits);
}

export function assembleBlock(opts: {
  prevHash: string;
  timestamp: number;
  bits: number;
  nonce?: bigint;
  extraNonce?: number;
  txs: Transaction[];
}): Block {
  const extraNonce = opts.extraNonce ?? 0;
  const header: BlockHeader = {
    version: VERSION,
    prevHash: opts.prevHash,
    merkleRoot: merkleRoot(opts.txs.map(txidOf)),
    timestamp: opts.timestamp,
    bits: opts.bits,
    nonce: (opts.nonce ?? 0n).toString(),
    extraNonce,
  };
  return { header, txs: opts.txs };
}

export { GENESIS_MESSAGE };
