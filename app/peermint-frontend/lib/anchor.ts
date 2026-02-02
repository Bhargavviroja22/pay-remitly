import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import idl from "../peermint.json";

export const PROGRAM_ID = new PublicKey("2rQAwzmXe4vXLCHAcVbEzqDU5i5mPkKoRp5tdPqYUWyS");
// Replace this with your own test token address after creating it
export const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"); // Devnet USDC or your test token

export function getProgram(provider: AnchorProvider): Program {
  return new Program(idl as Idl, provider);
}

export function getOrderPda(creator: PublicKey, nonce: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("order"),
      creator.toBuffer(),
      Buffer.from(new Uint8Array(new BigUint64Array([BigInt(nonce)]).buffer)),
    ],
    PROGRAM_ID
  );
}
