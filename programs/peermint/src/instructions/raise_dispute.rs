use anchor_lang::prelude::*;
use crate::state::Order;

#[derive(Accounts)]
pub struct RaiseDispute<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,
    #[account(mut)]
    pub order: Account<'info, Order>,
}

pub fn raise_dispute(ctx: Context<RaiseDispute>, _reason: Option<String>) -> Result<()> {
    let order = &mut ctx.accounts.order;
    order.status = 4; // Disputed
    // Note: storing reason would require expanding Order struct
    // For MVP, reason is client-side only
    Ok(())
}
