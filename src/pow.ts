import { INITIAL_BITS, RETARGET_CLAMP } from "./constants.ts";
import { hexToBytes } from "./encoding.ts";

/** Bitcoin-style compact target (nBits). */
export function bitsToTarget(bits: number): bigint {
  const exp = bits >>> 24;
  const mant = bits & 0x007fffff;
  if (exp <= 3) return BigInt(mant) >> BigInt(8 * (3 - exp));
  return BigInt(mant) << BigInt(8 * (exp - 3));
}

export function targetToBits(target: bigint): number {
  if (target <= 0n) return INITIAL_BITS;
  let hex = target.toString(16);
  if (hex.length % 2) hex = "0" + hex;
  let exp = hex.length / 2;
  let mantHex = hex.slice(0, 6);
  if (parseInt(mantHex.slice(0, 2), 16) >= 0x80) {
    mantHex = "00" + mantHex.slice(0, 4);
    exp += 1;
  }
  const mant = parseInt(mantHex.padEnd(6, "0").slice(0, 6), 16);
  return ((exp & 0xff) << 24) | (mant & 0x007fffff);
}

export function hashMeetsTarget(hashHex: string, bits: number): boolean {
  const target = bitsToTarget(bits);
  const h = hexToBytes(hashHex);
  let n = 0n;
  for (const b of h) n = (n << 8n) | BigInt(b);
  return n <= target;
}

/**
 * Bitcoin-style retarget: new_target = prev * actual / expected, clamped 4×
 * each window, and never easier than the launch floor (INITIAL_BITS).
 * Fast blocks (miners / faster BLAKE3) shrink the target — mining gets harder.
 */
export function retarget(prevBits: number, actualSpanMs: number, expectedSpanMs: number): number {
  const prev = bitsToTarget(prevBits);
  const lo = BigInt(Math.floor(expectedSpanMs / RETARGET_CLAMP));
  const hi = BigInt(expectedSpanMs * RETARGET_CLAMP);
  let span = BigInt(actualSpanMs);
  if (span < lo) span = lo;
  if (span > hi) span = hi;
  const next = (prev * span) / BigInt(expectedSpanMs);
  const easiest = bitsToTarget(INITIAL_BITS);
  const capped = next > easiest ? easiest : next < 1n ? 1n : next;
  return targetToBits(capped);
}

/** Difficulty 1 = launch bits. Grows as the target tightens. */
export function difficultyUnits(bits: number): bigint {
  const t = bitsToTarget(bits);
  if (t <= 0n) return 0n;
  return bitsToTarget(INITIAL_BITS) / t;
}
