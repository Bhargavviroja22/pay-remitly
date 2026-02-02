use anchor_lang::prelude::*;
use crate::state::Order;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct JoinRequest<'info> {
    #[account(mut)]
    pub helper: Signer<'info>,

    #[account(mut)]
    pub order: Account<'info, Order>,
}

pub fn join_request(ctx: Context<JoinRequest>) -> Result<()> {
    let order = &mut ctx.accounts.order;
    require!(order.status == 0, ErrorCode::InvalidStatus);
    require!(order.creator != *ctx.accounts.helper.key, ErrorCode::Unauthorized);
    order.helper = Some(*ctx.accounts.helper.key);
    order.status = 1; // Joined
    Ok(())
}
