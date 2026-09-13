/** Consensus constants. Amounts are integer nats (8 decimal places). */

export const TICKER = "NHC";
export const NAME = "NodeHashCoin";
export const DECIMALS = 8;
export const NAT = 100_000_000n;

export const MAX_SUPPLY_NHC = 21_000_000n;
export const MAX_SUPPLY = MAX_SUPPLY_NHC * NAT;

/** Heights 0..EPOCH0_LAST use EPOCH0_REWARD. */
export const EPOCH0_BLOCKS = 100;
export const EPOCH0_LAST = EPOCH0_BLOCKS - 1;
export const EPOCH0_TOTAL = 259_203_000_000_000n;
export const EPOCH0_REWARD = EPOCH0_TOTAL / BigInt(EPOCH0_BLOCKS);

/**
 * After epoch 0 the remaining cap is emitted over ~10 years of 60-second blocks
 * with Bitcoin-style coinbase halvings.
 *
 * Four public eras, 2.5 years / 1,314,900 blocks apart (1 + 1/2 + 1/4 + 1/8
 * of the first public reward ≈ remaining cap). Same shape as BTC (50 → 25 → …)
 * compressed onto a ten-year 60s clock.
 *
 * Difficulty starts at the easy launch floor so a browser/CPU finds the first
 * blocks. Retarget every 20 blocks toward 60s: as BLAKE3 hash rate grows
 * (browsers → AI-written GPU kernels → later specialized silicon) the target
 * tightens. It never eases past the launch floor.
 */
export const TARGET_BLOCK_MS = 60_000;
export const SECONDS_PER_YEAR = 365.25 * 24 * 3600;
export const PUBLIC_MINE_YEARS = 10;
export const PUBLIC_ERAS = 4;
export const PUBLIC_ERA_YEARS = PUBLIC_MINE_YEARS / PUBLIC_ERAS;
export const HALVING_INTERVAL = Math.round(
  (PUBLIC_ERA_YEARS * SECONDS_PER_YEAR) / (TARGET_BLOCK_MS / 1000),
);
export const PUBLIC_REMAINING = MAX_SUPPLY - EPOCH0_TOTAL;
/** First public-era reward so 4 halvings ≈ remaining cap (integer nats). */
export const PUBLIC_SUBSIDY = PUBLIC_REMAINING * 8n / 15n / BigInt(HALVING_INTERVAL);

export const RETARGET_WINDOW = 20;
/** Retarget cannot ease more than 4× or harden more than 4× per window (BTC). */
export const RETARGET_CLAMP = 4;

export const VERSION = 1;
export const ZERO_HASH = "00".repeat(32);

/**
 * Launch compact target. ~2^9 hashes/block: a phone or laptop finds the first
 * blocks in milliseconds, then 20-block retargets climb toward 60s.
 * Mantissa 0x7fffff at exponent 0x1f is ~128× easier than 0x1f00ffff.
 */
export const INITIAL_BITS = 0x1f7fffff;

/** First header time. Later headers may be minutes-to-days later. */
export const GENESIS_TIME = 1_749_945_600; // 2026-06-15T00:00:00Z
export const GENESIS_MESSAGE = "NodeHashCoin / MoltAd / nodehashcoin.com";

export const ADDRESS_PREFIX = "nhc1";
