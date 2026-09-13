import { blake3 } from "@noble/hashes/blake3.js";
import { bytesToHex, hexToBytes } from "./encoding.ts";

/** Consensus digest: BLAKE3-256. Not SHA-256. */
export function blake3Bytes(data: Uint8Array): Uint8Array {
  return blake3(data);
}

export function blake3Hex(data: Uint8Array): string {
  return bytesToHex(blake3(data));
}

export function hashHex(hex: string): string {
  return blake3Hex(hexToBytes(hex));
}

export { bytesToHex, hexToBytes };
