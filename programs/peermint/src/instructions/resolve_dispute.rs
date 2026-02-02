use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, Transfer};
use crate::state::Order;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct ResolveDispute<'info> {
    #[account(mut)]
    pub arbiter: Signer<'info>,

    #[account(mut)]
    pub order: Account<'info, Order>,

    /// CHECK: escrow token account
    #[account(mut)]
    pub escrow_ata: AccountInfo<'info>,

    /// CHECK: helper token account
    #[account(mut)]
    pub helper_ata: AccountInfo<'info>,

    /// CHECK: creator token account
    #[account(mut)]
    pub creator_ata: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn resolve_dispute(ctx: Context<ResolveDispute>, outcome: u8, split_bps: Option<u16>) -> Result<()> {
    require!(ctx.accounts.order.status == 4, ErrorCode::InvalidStatus);
    require!(ctx.accounts.order.arbiter == *ctx.accounts.arbiter.key, ErrorCode::Unauthorized);

    let total = ctx.accounts.order.amount;
    let creator_key = ctx.accounts.order.creator;
    let nonce = ctx.accounts.order.nonce;
    let bump = ctx.accounts.order.bump;

    let seeds = &[
        b"order".as_ref(),
        creator_key.as_ref(),
        &nonce.to_le_bytes(),
        &[bump],
    ];
    let signer = &[&seeds[..]];

    match outcome {
        0 => {
            // refund creator
            let cpi_accounts = Transfer {
                from: ctx.accounts.escrow_ata.to_account_info(),
                to: ctx.accounts.creator_ata.to_account_info(),
                authority: ctx.accounts.order.to_account_info(),
            };
            let cpi_ctx = CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), cpi_accounts, signer);
            token::transfer(cpi_ctx, total)?;
        }
        1 => {
            // pay helper
            let cpi_accounts = Transfer {
                from: ctx.accounts.escrow_ata.to_account_info(),
                to: ctx.accounts.helper_ata.to_account_info(),
                authority: ctx.accounts.order.to_account_info(),
            };
            let cpi_ctx = CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), cpi_accounts, signer);
            token::transfer(cpi_ctx, total)?;
        }
        2 => {
            // split
            let bps = split_bps.ok_or(ErrorCode::InvalidFee)?;
            require!(bps <= 10000, ErrorCode::InvalidFee);
            let to_helper = (total as u128)
                .checked_mul(bps as u128).ok_or(ErrorCode::MathOverflow)?
                .checked_div(10000u128).ok_or(ErrorCode::MathOverflow)? as u64;
            let to_creator = total.checked_sub(to_helper).ok_or(ErrorCode::MathOverflow)?;

            let cpi_accounts1 = Transfer {
                from: ctx.accounts.escrow_ata.to_account_info(),
                to: ctx.accounts.helper_ata.to_account_info(),
                authority: ctx.accounts.order.to_account_info(),
            };
            let cpi_ctx1 = CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), cpi_accounts1, signer);
            token::transfer(cpi_ctx1, to_helper)?;

            let cpi_accounts2 = Transfer {
                from: ctx.accounts.escrow_ata.to_account_info(),
                to: ctx.accounts.creator_ata.to_account_info(),
                authority: ctx.accounts.order.to_account_info(),
            };
            let cpi_ctx2 = CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), cpi_accounts2, signer);
            token::transfer(cpi_ctx2, to_creator)?;
        }
        _ => return Err(ErrorCode::InvalidOutcome.into()),
    }

    ctx.accounts.order.status = 5; // Resolved
    Ok(())
}
