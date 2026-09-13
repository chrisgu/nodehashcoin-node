import { isAddress, pubkeyHexToAddress } from "./address.ts";
import { assembleBlock, blockMerkle, headerHash, headerValidPow, type Block } from "./block.ts";
import { GENESIS_MESSAGE, INITIAL_BITS, RETARGET_WINDOW, TARGET_BLOCK_MS, ZERO_HASH } from "./constants.ts";
import { retarget } from "./pow.ts";
import { clampSubsidy } from "./subsidy.ts";
import { amountToNats, makeCoinbase, outputSum, txidOf, type Transaction, verifyInputSig } from "./tx.ts";

export type Utxo = {
  txid: string;
  vout: number;
  address: string;
  amount: string;
};

export type ChainState = {
  height: number;
  tipHash: string;
  bits: number;
  issued: string;
  headers: { height: number; hash: string; timestamp: number; bits: number }[];
  utxos: Record<string, Utxo>;
};

export function emptyState(): ChainState {
  return {
    height: -1,
    tipHash: ZERO_HASH,
    bits: INITIAL_BITS,
    issued: "0",
    headers: [],
    utxos: {},
  };
}

export function utxoKey(txid: string, vout: number): string {
  return `${txid}:${vout}`;
}

export async function applyBlock(state: ChainState, block: Block): Promise<ChainState> {
  const height = state.height + 1;
  const hash = headerHash(block.header);
  if (block.header.prevHash !== state.tipHash) throw new Error("bad prev");
  if (block.header.merkleRoot !== blockMerkle(block)) throw new Error("bad merkle");
  if (block.header.version !== 1) throw new Error("bad version");
  if (!headerValidPow(block.header)) throw new Error("bad pow");
  if (block.header.bits !== state.bits) throw new Error("bad bits");
  if (height > 0) {
    const prevTs = state.headers[state.headers.length - 1]?.timestamp ?? 0;
    if (block.header.timestamp + 7200 < prevTs) throw new Error("timestamp rewind");
  }
  if (!block.txs.length || !block.txs[0].coinbase) throw new Error("missing coinbase");

  const issued = BigInt(state.issued);
  const subsidy = clampSubsidy(height, issued);
  const coinbase = block.txs[0];
  if (outputSum(coinbase) !== subsidy) throw new Error("bad coinbase amount");
  if (coinbase.inputs.length) throw new Error("coinbase has inputs");
  for (const o of coinbase.outputs) {
    if (!isAddress(o.address)) throw new Error("bad coinbase address");
    if (amountToNats(o.amount) <= 0n) throw new Error("zero output");
  }

  const utxos = { ...state.utxos };
  for (let i = 1; i < block.txs.length; i++) {
    const tx = block.txs[i];
    if (tx.coinbase) throw new Error("extra coinbase");
    let inSum = 0n;
    const spent: string[] = [];
    for (const inn of tx.inputs) {
      const k = utxoKey(inn.txid, inn.vout);
      const u = utxos[k];
      if (!u) throw new Error("missing utxo");
      if (pubkeyHexToAddress(inn.pubkey) !== u.address) throw new Error("pubkey mismatch");
      if (!(await verifyInputSig(tx, inn))) throw new Error("bad sig");
      inSum += amountToNats(u.amount);
      spent.push(k);
    }
    const out = outputSum(tx);
    if (out <= 0n || out > inSum) throw new Error("bad outputs");
    for (const k of spent) delete utxos[k];
    const id = txidOf(tx);
    tx.outputs.forEach((o, vout) => {
      if (!isAddress(o.address)) throw new Error("bad address");
      utxos[utxoKey(id, vout)] = { txid: id, vout, address: o.address, amount: o.amount };
    });
  }

  const cbId = txidOf(coinbase);
  coinbase.outputs.forEach((o, vout) => {
    utxos[utxoKey(cbId, vout)] = { txid: cbId, vout, address: o.address, amount: o.amount };
  });

  const headers = state.headers.concat({
    height,
    hash,
    timestamp: block.header.timestamp,
    bits: block.header.bits,
  });

  let nextBits = state.bits;
  if ((height + 1) % RETARGET_WINDOW === 0 && headers.length >= RETARGET_WINDOW) {
    const window = headers.slice(-RETARGET_WINDOW);
    const span = Math.max(1, (window[window.length - 1].timestamp - window[0].timestamp) * 1000);
    nextBits = retarget(state.bits, span, TARGET_BLOCK_MS * RETARGET_WINDOW);
  }

  return {
    height,
    tipHash: hash,
    bits: nextBits,
    issued: (issued + subsidy).toString(),
    headers,
    utxos,
  };
}

export function workTemplate(
  state: ChainState,
  payout: string,
  mempool: Transaction[] = [],
  timestamp = Math.floor(Date.now() / 1000),
): Block {
  const height = state.height + 1;
  const subsidy = clampSubsidy(height, BigInt(state.issued));
  const coinbase = makeCoinbase(payout, subsidy, 0, height === 0 ? GENESIS_MESSAGE : undefined);
  return assembleBlock({
    prevHash: state.tipHash,
    timestamp,
    bits: state.bits,
    txs: [coinbase, ...mempool],
  });
}
