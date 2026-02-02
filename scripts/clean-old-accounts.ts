/**
 * Script to identify and optionally close old incompatible order accounts
 * Run with: npx ts-node scripts/clean-old-accounts.ts
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import idl from "../target/idl/peermint.json";

const PROGRAM_ID = new PublicKey("2rQAwzmXe4vXLCHAcVbEzqDU5i5mPkKoRp5tdPqYUWyS");
const RPC_URL = "https://api.devnet.solana.com";

async function findOldAccounts() {
  console.log("🔍 Scanning for order accounts...\n");
  
  const connection = new Connection(RPC_URL, "confirmed");
  
  try {
    // Get all accounts owned by the program
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        {
          dataSize: 165, // Adjust based on your Order account size (check with: anchor account order <pubkey>)
        }
      ]
    });

    console.log(`Found ${accounts.length} potential order accounts\n`);

    // Try to deserialize each account
    const incompatibleAccounts: PublicKey[] = [];
    const validAccounts: PublicKey[] = [];

    for (const { pubkey, account } of accounts) {
      try {
        // Dummy wallet for testing
        const dummyWallet = {
          publicKey: new PublicKey("11111111111111111111111111111111"),
          signTransaction: async (tx: any) => tx,
          signAllTransactions: async (txs: any) => txs,
        } as Wallet;

        const provider = new AnchorProvider(connection, dummyWallet, {});
        const program = new Program(idl as any, provider);

        // Try to fetch and decode
        await program.account.order.fetch(pubkey);
        validAccounts.push(pubkey);
        console.log(`✅ Valid: ${pubkey.toString()}`);
      } catch (error) {
        incompatibleAccounts.push(pubkey);
        console.log(`❌ Incompatible: ${pubkey.toString()}`);
        if (error instanceof Error) {
          console.log(`   Error: ${error.message.substring(0, 80)}...`);
        }
      }
    }

    console.log("\n📊 Summary:");
    console.log(`Valid accounts: ${validAccounts.length}`);
    console.log(`Incompatible accounts: ${incompatibleAccounts.length}`);

    if (incompatibleAccounts.length > 0) {
      console.log("\n⚠️  Incompatible account addresses:");
      incompatibleAccounts.forEach(pubkey => {
        console.log(`   ${pubkey.toString()}`);
      });
      
      console.log("\n💡 To close these accounts and reclaim rent:");
      console.log("   1. Update your program with a 'close_order' instruction");
      console.log("   2. Or wait for them to be garbage collected (if rent-exempt period expires)");
      console.log("   3. Or redeploy with `anchor deploy --program-id <keypair>` to use new accounts\n");
    }

  } catch (error) {
    console.error("Error scanning accounts:", error);
  }
}

findOldAccounts();
