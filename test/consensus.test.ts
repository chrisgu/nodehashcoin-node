import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { secretToAddress, secretToPubkeyHex, pubkeyHexToAddress } from "../src/address.ts";
import { applyBlock, emptyState, workTemplate } from "../src/chain.ts";
import {
  EPOCH0_BLOCKS,
  EPOCH0_REWARD,
  EPOCH0_TOTAL,
  HALVING_INTERVAL,
  INITIAL_BITS,
  MAX_SUPPLY,
  PUBLIC_ERAS,
  PUBLIC_MINE_YEARS,
  PUBLIC_SUBSIDY,
  RETARGET_WINDOW,
  SECONDS_PER_YEAR,
  TARGET_BLOCK_MS,
  TICKER,
} from "../src/constants.ts";
import { publicScheduleSummary } from "../src/emission.ts";
import { blake3Hex } from "../src/hash.ts";
import { mineBlock, randomPayout } from "../src/mine.ts";
import { bitsToTarget, difficultyUnits, hashMeetsTarget } from "../src/pow.ts";
import { createStore, submitBlock } from "../src/rpc.ts";
import { blockSubsidy } from "../src/subsidy.ts";
import { headerHash } from "../src/block.ts";
import { utf8 } from "../src/encoding.ts";

describe("consensus", () => {
  it("uses BLAKE3 not SHA-256", () => {
    const h = blake3Hex(utf8("nhc"));
    assert.equal(h.length, 64);
    assert.notEqual(h, "0".repeat(64));
  });

  it("caps supply at 21M and emits the rest over ~10 years with BTC-style halvings", () => {
    assert.equal(TICKER, "NHC");
    assert.equal(MAX_SUPPLY, 21_000_000n * 100_000_000n);
    assert.equal(blockSubsidy(0), EPOCH0_REWARD);
    assert.equal(blockSubsidy(EPOCH0_BLOCKS - 1), EPOCH0_REWARD);
    assert.equal(blockSubsidy(EPOCH0_BLOCKS), PUBLIC_SUBSIDY);
    assert.equal(blockSubsidy(EPOCH0_BLOCKS + HALVING_INTERVAL), PUBLIC_SUBSIDY / 2n);
    assert.equal(blockSubsidy(EPOCH0_BLOCKS + HALVING_INTERVAL * 2), PUBLIC_SUBSIDY / 4n);
    assert.equal(blockSubsidy(EPOCH0_BLOCKS + HALVING_INTERVAL * 3), PUBLIC_SUBSIDY / 8n);
    assert.equal(EPOCH0_REWARD * BigInt(EPOCH0_BLOCKS), EPOCH0_TOTAL);
    const sched = publicScheduleSummary();
    assert.ok(Math.abs(sched.publicYears - PUBLIC_MINE_YEARS) < 0.02);
    const publicSeconds = HALVING_INTERVAL * PUBLIC_ERAS * (TARGET_BLOCK_MS / 1000);
    assert.equal(publicSeconds, PUBLIC_MINE_YEARS * SECONDS_PER_YEAR);
  });

  it("launch bits are easy and difficulty 1", () => {
    assert.equal(difficultyUnits(INITIAL_BITS), 1n);
    assert.ok(bitsToTarget(INITIAL_BITS) > bitsToTarget(0x1f00ffff));
  });

  it("meets compact target", () => {
    const bits = 0x207fffff;
    const target = bitsToTarget(bits);
    assert.ok(target > 0n);
    assert.equal(hashMeetsTarget("00".repeat(32), bits), true);
  });

  it("mines genesis and a following block", async () => {
    const a = await randomPayout();
    const store = createStore();
    const block0 = await mineBlock(workTemplate(store.state, a.address, [], 1_749_945_600));
    const r0 = await submitBlock(store, block0);
    assert.equal(r0.height, 0);
    assert.equal(store.state.issued, EPOCH0_REWARD.toString());
    const b = await randomPayout();
    const block1 = await mineBlock(workTemplate(store.state, b.address, [], 1_749_945_660));
    const r1 = await submitBlock(store, block1);
    assert.equal(r1.height, 1);
    assert.equal(headerHash(block1.header).length, 64);
  });

  it("hardens after a window of fast blocks", async () => {
    const a = await randomPayout();
    const store = createStore();
    const t0 = 1_749_945_600;
    for (let i = 0; i < RETARGET_WINDOW; i++) {
      const mined = await mineBlock(workTemplate(store.state, a.address, [], t0 + i));
      await submitBlock(store, mined);
    }
    assert.ok(difficultyUnits(store.state.bits) >= 4n);
  });

  it("rejects a block with the wrong prev hash", async () => {
    const a = await randomPayout();
    let state = emptyState();
    const g = await mineBlock(workTemplate(state, a.address, [], 1_749_945_600));
    state = await applyBlock(state, g);
    const bad = await mineBlock(workTemplate(emptyState(), a.address, [], 1_749_945_600));
    await assert.rejects(() => applyBlock(state, bad));
  });

  it("derives nhc1 addresses from ed25519", async () => {
    const secret = "11".repeat(32);
    const pub = await secretToPubkeyHex(secret);
    const addr = pubkeyHexToAddress(pub);
    assert.match(addr, /^nhc1[0-9a-f]{40}$/);
    assert.equal(await secretToAddress(secret), addr);
  });
});
