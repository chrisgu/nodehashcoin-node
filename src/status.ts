import { MAX_SUPPLY, NAME, TICKER } from "./constants.ts";
import { difficultyUnits } from "./pow.ts";
import { blockSubsidy, nextHalvingHeight, subsidyEra } from "./subsidy.ts";
import type { ChainState } from "./chain.ts";

export function chainStatus(state: ChainState, miningOpen: boolean) {
  const nextHeight = state.height + 1;
  const next = blockSubsidy(nextHeight);
  return {
    name: NAME,
    ticker: TICKER,
    height: state.height,
    tip: state.tipHash,
    bits: state.bits,
    difficulty: difficultyUnits(state.bits).toString(),
    issued: state.issued,
    maxSupply: MAX_SUPPLY.toString(),
    nextSubsidy: next.toString(),
    nextSubsidyNhc: Number(next) / 1e8,
    subsidyEra: subsidyEra(nextHeight),
    nextHalvingHeight: nextHalvingHeight(state.height),
    miningOpen,
    hashAlgo: "BLAKE3",
    targetBlockSec: 60,
  };
}
