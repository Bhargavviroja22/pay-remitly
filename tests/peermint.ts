import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Peermint } from "../target/types/peermint";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID, 
  createMint, 
  mintTo, 
  getOrCreateAssociatedTokenAccount,
  getAssociatedTokenAddressSync,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import { expect } from "chai";

describe("peermint escrow tests", () => {
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);
  const program = anchor.workspace.Peermint as Program<Peermint>;
  const connection = provider.connection;

  const creator = provider.wallet as anchor.Wallet;
  const helper = Keypair.generate();

  let usdcMint: PublicKey;
  let creatorUsdcAta: PublicKey;
  let helperUsdcAta: PublicKey;
  let feeReceiverAta: PublicKey;
  let orderPda: PublicKey;
  let escrowAta: PublicKey;
  let nonce: anchor.BN;

  it("setup mint and ATAs", async () => {
    usdcMint = await createMint(connection, creator.payer, creator.publicKey, null, 6);
    console.log("USDC Mint:", usdcMint.toString());

    const creatorAtaAcc = await getOrCreateAssociatedTokenAccount(connection, creator.payer, usdcMint, creator.publicKey);
    creatorUsdcAta = creatorAtaAcc.address;

    const helperAtaAcc = await getOrCreateAssociatedTokenAccount(connection, creator.payer, usdcMint, helper.publicKey);
    helperUsdcAta = helperAtaAcc.address;

    feeReceiverAta = creatorUsdcAta;

    await mintTo(connection, creator.payer, usdcMint, creatorUsdcAta, creator.publicKey, 1_000_000_000);

    const balance = await connection.getTokenAccountBalance(creatorUsdcAta);
    console.log("Creator USDC balance:", balance.value.uiAmount);
    expect(Number(balance.value.amount)).to.equal(1_000_000_000);

    const airdropSig = await connection.requestAirdrop(helper.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    await connection.confirmTransaction(airdropSig);
  });

  it("create_request moves USDC to escrow", async () => {
    const amount = new anchor.BN(1_000_000);
    const inrAmount = new anchor.BN(8400); // 84 INR = 1 USD, so 1 USDC = 84 INR = 8400 paise
    nonce = new anchor.BN(Date.now());
    const qr = "upi://pay?pa=test@paytm&am=1";
    const expiryTs = new anchor.BN(Math.floor(Date.now() / 1000) + 3600);
    const feeBps = 5; // 5% fee

    [orderPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("order"), creator.publicKey.toBuffer(), nonce.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    escrowAta = getAssociatedTokenAddressSync(usdcMint, orderPda, true);

    // Create the escrow ATA manually before the instruction
    await getOrCreateAssociatedTokenAccount(
      connection,
      creator.payer,
      usdcMint,
      orderPda,
      true // allowOwnerOffCurve
    );

    await program.methods
      .createRequest(amount, inrAmount, expiryTs, feeBps, nonce, qr)
      .accounts({
        creator: creator.publicKey,
        order: orderPda,
        mint: usdcMint,
        sourceAta: creatorUsdcAta,
        escrowAta: escrowAta,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const order = await program.account.order.fetch(orderPda);
    expect(order.amount.toNumber()).to.equal(1_000_000);
    expect(order.qrString).to.equal(qr);

    const escrowInfo = await connection.getTokenAccountBalance(escrowAta);
    expect(Number(escrowInfo.value.amount)).to.equal(1_000_000);
  });

  it("join, mark_paid, acknowledge_and_release", async () => {
    await program.methods.joinRequest().accounts({ helper: helper.publicKey, order: orderPda }).signers([helper]).rpc();

    let order = await program.account.order.fetch(orderPda);
    expect(order.status).to.equal(1);

    await program.methods.markPaid(null).accounts({ helper: helper.publicKey, order: orderPda }).signers([helper]).rpc();

    order = await program.account.order.fetch(orderPda);
    expect(order.status).to.equal(2);

    await program.methods
      .acknowledgeAndRelease()
      .accounts({
        creator: creator.publicKey,
        order: orderPda,
        escrowAta: escrowAta,
        helperAta: helperUsdcAta,
        feeReceiverAta: feeReceiverAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    order = await program.account.order.fetch(orderPda);
    expect(order.status).to.equal(3);

    const helperBal = await connection.getTokenAccountBalance(helperUsdcAta);
    expect(Number(helperBal.value.amount)).to.equal(995_000);
  });
});
