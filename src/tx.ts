import { signAsync, verifyAsync } from "@noble/ed25519";
import { pubkeyHexToAddress } from "./address.ts";
import { bytesToHex, concat, hexToBytes, u32le, u64le, utf8, withLen } from "./encoding.ts";
import { blake3Hex } from "./hash.ts";

export type TxInput = {
  txid: string;
  vout: number;
  pubkey: string;
  sig: string;
};

export type TxOutput = {
  address: string;
  amount: string;
};

export type Transaction = {
  version: number;
  coinbase: boolean;
  extraNonce: number;
  message?: string;
  inputs: TxInput[];
  outputs: TxOutput[];
};

export function amountToNats(s: string | bigint | number): bigint {
  if (typeof s === "bigint") return s;
  if (typeof s === "number") return BigInt(Math.trunc(s));
  return BigInt(s);
}

export function serializeTxBody(tx: Transaction, includeWitness: boolean): Uint8Array {
  const parts: Uint8Array[] = [u32le(tx.version), u8(tx.coinbase ? 1 : 0), u32le(tx.extraNonce)];
  const msg = utf8(tx.message ?? "");
  parts.push(withLen(msg));
  parts.push(u32le(tx.inputs.length));
  for (const inn of tx.inputs) {
    parts.push(hexToBytes(inn.txid));
    parts.push(u32le(inn.vout));
    if (includeWitness) {
      parts.push(hexToBytes(inn.pubkey));
      parts.push(hexToBytes(inn.sig));
    }
  }
  parts.push(u32le(tx.outputs.length));
  for (const out of tx.outputs) {
    parts.push(withLen(utf8(out.address)));
    parts.push(u64le(amountToNats(out.amount)));
  }
  return concat(...parts);
}

function u8(n: number): Uint8Array {
  return new Uint8Array([n & 0xff]);
}

export function txidOf(tx: Transaction): string {
  return blake3Hex(serializeTxBody(tx, true));
}

export function sighash(tx: Transaction): Uint8Array {
  return hexToBytes(blake3Hex(serializeTxBody(tx, false)));
}

export async function signTx(tx: Transaction, secretHex: string): Promise<Transaction> {
  const hash = sighash(tx);
  const signedInputs: TxInput[] = [];
  for (const inn of tx.inputs) {
    const sig = await signAsync(hash, hexToBytes(secretHex));
    signedInputs.push({ ...inn, sig: bytesToHex(sig) });
  }
  return { ...tx, inputs: signedInputs };
}

export async function verifyInputSig(tx: Transaction, inn: TxInput): Promise<boolean> {
  if (inn.sig.length !== 128 || inn.pubkey.length !== 64) return false;
  const ok = await verifyAsync(hexToBytes(inn.sig), sighash(tx), hexToBytes(inn.pubkey));
  if (!ok) return false;
  return pubkeyHexToAddress(inn.pubkey) !== "";
}

export function outputSum(tx: Transaction): bigint {
  return tx.outputs.reduce((a, o) => a + amountToNats(o.amount), 0n);
}

export function makeCoinbase(address: string, amount: bigint, extraNonce = 0, message?: string): Transaction {
  return {
    version: 1,
    coinbase: true,
    extraNonce,
    message,
    inputs: [],
    outputs: [{ address, amount: amount.toString() }],
  };
}
