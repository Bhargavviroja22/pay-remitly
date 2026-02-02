use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, Transfer};
use crate::state::Order;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct AcknowledgeAndRelease<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(mut, has_one = creator)]
    pub order: Account<'info, Order>,

    /// CHECK: Escrow ATA (owned by PDA)
    #[account(mut)]
    pub escrow_ata: AccountInfo<'info>,

    /// CHECK: Helper's ATA to receive payout (amount + fee)
    #[account(mut)]
    pub helper_ata: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn acknowledge_and_release(ctx: Context<AcknowledgeAndRelease>) -> Result<()> {
    require!(ctx.accounts.order.status == 2, ErrorCode::InvalidStatus);
    require!(ctx.accounts.order.creator == *ctx.accounts.creator.key, ErrorCode::Unauthorized);
    
    let amount = ctx.accounts.order.amount;
    let fee_percentage = ctx.accounts.order.fee_percentage;
    let creator_key = ctx.accounts.order.creator;
    let nonce = ctx.accounts.order.nonce;
    let bump = ctx.accounts.order.bump;
    
    // Calculate fee: amount * fee_percentage / 100
    // The escrow contains (amount + fee), so we send amount to helper and fee separately
    let fee = (amount as u128)
        .checked_mul(fee_percentage as u128).ok_or(ErrorCode::MathOverflow)?
        .checked_div(100u128).ok_or(ErrorCode::MathOverflow)? as u64;

    let seeds = &[
        b"order".as_ref(),
        creator_key.as_ref(),
        &nonce.to_le_bytes(),
        &[bump],
    ];
    let signer = &[&seeds[..]];

    // Send the full amount to helper (what they paid on behalf of creator)
    let cpi_accounts = Transfer {
        from: ctx.accounts.escrow_ata.to_account_info(),
        to: ctx.accounts.helper_ata.to_account_info(),
        authority: ctx.accounts.order.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    token::transfer(cpi_ctx, amount)?;

    // Send the fee to helper as their incentive
    if fee > 0 {
        let cpi_accounts_fee = Transfer {
            from: ctx.accounts.escrow_ata.to_account_info(),
            to: ctx.accounts.helper_ata.to_account_info(),
            authority: ctx.accounts.order.to_account_info(),
        };
        let cpi_ctx_fee = CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), cpi_accounts_fee, signer);
        token::transfer(cpi_ctx_fee, fee)?;
    }

    ctx.accounts.order.status = 3; // Released
    ctx.accounts.order.released_at = Some(Clock::get()?.unix_timestamp);
    Ok(())
}

pub fn auto_release(ctx: Context<AcknowledgeAndRelease>) -> Result<()> {
    let order = &mut ctx.accounts.order;
    require!(order.status == 2 || order.status == 1, ErrorCode::InvalidStatus);
    let now = Clock::get()?.unix_timestamp;
    require!(order.expiry_ts > 0 && now >= order.expiry_ts, ErrorCode::NotExpired);

    // same transfer logic
    acknowledge_and_release(ctx)
}
