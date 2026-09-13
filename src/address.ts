import { getPublicKeyAsync } from "@noble/ed25519";
import { ADDRESS_PREFIX } from "./constants.ts";
import { bytesToHex, hexToBytes } from "./encoding.ts";
import { blake3Bytes } from "./hash.ts";

export function pubkeyHexToAddress(pubkeyHex: string): string {
  const pub = hexToBytes(pubkeyHex);
  if (pub.length !== 32) throw new Error("ed25519 pubkey must be 32 bytes");
  return ADDRESS_PREFIX + bytesToHex(blake3Bytes(pub).slice(0, 20));
}

export async function secretToPubkeyHex(secretHex: string): Promise<string> {
  const pub = await getPublicKeyAsync(hexToBytes(secretHex));
  return bytesToHex(pub);
}

export async function secretToAddress(secretHex: string): Promise<string> {
  return pubkeyHexToAddress(await secretToPubkeyHex(secretHex));
}

export function isAddress(s: string): boolean {
  return /^nhc1[0-9a-f]{40}$/.test(s);
}
