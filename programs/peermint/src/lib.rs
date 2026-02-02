use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;
pub mod errors;

use instructions::*;

declare_id!("2rQAwzmXe4vXLCHAcVbEzqDU5i5mPkKoRp5tdPqYUWyS");

#[program]
pub mod peermint {
    use super::*;

    /// Create a request and transfer USDC from creator's source_ata to the escrow ATA owned by the request PDA.
    /// Client must ensure they hold USDC (swap via Jupiter if needed) and pass `source_ata`.
    pub fn create_request(
        ctx: Context<CreateRequest>,
        amount: u64,
        inr_amount: u64,
        expiry_ts: i64,
        fee_percentage: u8,
        nonce: u64,
        qr_string: String,
    ) -> Result<()> {
        instructions::create_request::create_request(
            ctx,
            amount,
            inr_amount,
            expiry_ts,
            fee_percentage,
            nonce,
            qr_string,
        )
    }

    /// Join a request as fulfiller (set fulfiller pubkey)
    pub fn join_request(ctx: Context<JoinRequest>) -> Result<()> {
        instructions::join_request::join_request(ctx)
    }

    /// Helper marks paid (optional receipt_hash)
    pub fn mark_paid(ctx: Context<MarkPaid>, receipt_hash: Option<[u8; 32]>) -> Result<()> {
        instructions::mark_paid::mark_paid(ctx, receipt_hash)
    }

    /// Creator acknowledges and release funds from escrow ATA to helper's ATA (minus fee)
    pub fn acknowledge_and_release(ctx: Context<AcknowledgeAndRelease>) -> Result<()> {
        instructions::acknowledge_and_release::acknowledge_and_release(ctx)
    }

    /// Auto-release after expiry
    pub fn auto_release(ctx: Context<AcknowledgeAndRelease>) -> Result<()> {
        instructions::acknowledge_and_release::auto_release(ctx)
    }

    /// Raise dispute
    pub fn raise_dispute(ctx: Context<RaiseDispute>, reason: Option<String>) -> Result<()> {
        instructions::raise_dispute::raise_dispute(ctx, reason)
    }

    /// Resolve dispute (arbiter)
    pub fn resolve_dispute(ctx: Context<ResolveDispute>, outcome: u8, split_bps: Option<u16>) -> Result<()> {
        instructions::resolve_dispute::resolve_dispute(ctx, outcome, split_bps)
    }
}
