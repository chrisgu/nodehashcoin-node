#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildGenesis, randomPayout } from "./mine.ts";

const payout = process.env.GENESIS_PAYOUT || (await randomPayout()).address;
const { block, hash, state } = await buildGenesis(payout);
const out = {
  hash,
  height: 0,
  issued: state.issued,
  payout,
  block,
};
const dest = process.argv[2] || resolve(process.cwd(), "genesis.json");
writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");
console.log(`genesis ${hash} -> ${dest}`);
