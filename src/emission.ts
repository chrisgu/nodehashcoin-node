import {
  EPOCH0_BLOCKS,
  EPOCH0_TOTAL,
  HALVING_INTERVAL,
  MAX_SUPPLY,
  PUBLIC_ERAS,
  PUBLIC_MINE_YEARS,
  PUBLIC_SUBSIDY,
  SECONDS_PER_YEAR,
  TARGET_BLOCK_MS,
} from "./constants.ts";
import { blockSubsidy } from "./subsidy.ts";

export function publicBlocksForYears(years: number): number {
  return Math.round((years * SECONDS_PER_YEAR) / (TARGET_BLOCK_MS / 1000));
}

/** Issued nats from height 0 inclusive through `throughHeight` inclusive. */
export function issuedThrough(throughHeight: number): bigint {
  let sum = 0n;
  for (let h = 0; h <= throughHeight; h++) sum += blockSubsidy(h);
  return sum > MAX_SUPPLY ? MAX_SUPPLY : sum;
}

export function publicScheduleSummary() {
  const publicBlocks = HALVING_INTERVAL * PUBLIC_ERAS;
  const seconds = publicBlocks * (TARGET_BLOCK_MS / 1000);
  const years = seconds / SECONDS_PER_YEAR;
  let publicIssued = 0n;
  for (let era = 0; era < PUBLIC_ERAS; era++) {
    const reward = PUBLIC_SUBSIDY / 2n ** BigInt(era);
    publicIssued += reward * BigInt(HALVING_INTERVAL);
  }
  return {
    epoch0Blocks: EPOCH0_BLOCKS,
    epoch0Issued: EPOCH0_TOTAL.toString(),
    publicEras: PUBLIC_ERAS,
    blocksPerEra: HALVING_INTERVAL,
    firstPublicReward: PUBLIC_SUBSIDY.toString(),
    publicBlocks,
    publicYears: years,
    publicIssued: publicIssued.toString(),
    maxSupply: MAX_SUPPLY.toString(),
    targetYears: PUBLIC_MINE_YEARS,
  };
}
