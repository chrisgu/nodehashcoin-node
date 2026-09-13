import {
  EPOCH0_LAST,
  EPOCH0_REWARD,
  HALVING_INTERVAL,
  MAX_SUPPLY,
  PUBLIC_SUBSIDY,
} from "./constants.ts";

/** Bitcoin-style coinbase: opening epoch, then reward halves every HALVING_INTERVAL. */
export function blockSubsidy(height: number): bigint {
  if (height < 0) return 0n;
  if (height <= EPOCH0_LAST) return EPOCH0_REWARD;
  const era = Math.floor((height - EPOCH0_LAST - 1) / HALVING_INTERVAL);
  let reward = PUBLIC_SUBSIDY;
  for (let i = 0; i < era; i++) {
    reward /= 2n;
    if (reward === 0n) return 0n;
  }
  return reward;
}

export function clampSubsidy(height: number, alreadyIssued: bigint): bigint {
  const want = blockSubsidy(height);
  if (alreadyIssued >= MAX_SUPPLY) return 0n;
  const room = MAX_SUPPLY - alreadyIssued;
  return want > room ? room : want;
}

/** 0 = opening blocks; 1, 2, 3, … = public eras between halvings. */
export function subsidyEra(height: number): number {
  if (height < 0) return 0;
  if (height <= EPOCH0_LAST) return 0;
  return 1 + Math.floor((height - EPOCH0_LAST - 1) / HALVING_INTERVAL);
}

export function nextHalvingHeight(height: number): number | null {
  const firstPublic = EPOCH0_LAST + 1;
  const idx = Math.max(0, height - firstPublic);
  const era = Math.floor(idx / HALVING_INTERVAL);
  if (era >= 64) return null;
  const next = firstPublic + (era + 1) * HALVING_INTERVAL;
  return next;
}
