use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, Transfer};
use anchor_spl::associated_token::AssociatedToken;
use crate::state::Order;
use crate::errors::ErrorCode;

#[derive(Accounts)]
#[instruction(amount: u64, inr_amount: u64, expiry_ts: i64, fee_percentage: u8, nonce: u64, qr_string: String)]
pub struct CreateRequest<'info> {
    /// payer/creator
    #[account(mut)]
    pub creator: Signer<'info>,

    /// Order PDA
    #[account(
        init,
        payer = creator,
        space = Order::LEN,
        seeds = [b"order", creator.key().as_ref(), &nonce.to_le_bytes()],
        bump
    )]
    pub order: Account<'info, Order>,

    /// CHECK: Mint (USDC)
    pub mint: AccountInfo<'info>,

    /// CHECK: Source ATA (creator's USDC account)
    #[account(mut)]
    pub source_ata: AccountInfo<'info>,

    /// CHECK: Escrow ATA for order PDA  
    #[account(mut)]
    pub escrow_ata: AccountInfo<'info>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn create_request(
    ctx: Context<CreateRequest>,
    amount: u64,
    inr_amount: u64,
    expiry_ts: i64,
    fee_percentage: u8,
    nonce: u64,
    qr_string: String,
) -> Result<()> {
    require!(amount > 0, ErrorCode::InvalidAmount);
    require!(inr_amount > 0, ErrorCode::InvalidAmount);
    require!(fee_percentage <= 100, ErrorCode::InvalidFee);
    require!(qr_string.len() <= 500, ErrorCode::QRTooLong); // Increased from 200 to 500

    // Calculate total amount including helper fee
    // fee_percentage is stored as percentage (e.g., 0.5 for 0.5%)
    // If amount = 1000000 (1 USDC) and fee_percentage = 0.5%, fee = 5000 (0.005 USDC)
    let fee_amount = (amount as u128)
        .checked_mul(fee_percentage as u128)
        .unwrap()
        .checked_div(100) // Convert percentage to decimal (0.5% / 100 = 0.005)
        .unwrap() as u64;
    
    let total_amount = amount.checked_add(fee_amount).unwrap();

    let order = &mut ctx.accounts.order;
    order.creator = *ctx.accounts.creator.key;
    order.helper = None;
    order.token_mint = ctx.accounts.mint.key();
    order.amount = amount;
    order.inr_amount = inr_amount; // Store INR amount
    order.status = 0;
    order.created_at = Clock::get()?.unix_timestamp;
    order.expiry_ts = expiry_ts;
    order.paid_at = None;
    order.released_at = None;
    order.receipt_hash = None;
    order.fee_percentage = fee_percentage;
    // for simplicity set arbiter = creator; frontend may pass a different account in advanced version
    order.arbiter = *ctx.accounts.creator.key;
    order.nonce = nonce;
    order.bump = ctx.bumps.order;
    order.qr_string = qr_string;

    // Transfer total amount (amount + fee) from creator -> escrow account
    let cpi_accounts = Transfer {
        from: ctx.accounts.source_ata.to_account_info(),
        to: ctx.accounts.escrow_ata.to_account_info(),
        authority: ctx.accounts.creator.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    // Transfer the total amount (amount + fee)
    token::transfer(cpi_ctx, total_amount)?;

    Ok(())
}
