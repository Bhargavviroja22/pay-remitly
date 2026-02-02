use anchor_lang::prelude::*;

#[account]
pub struct Order {
    pub creator: Pubkey,                // 32
    pub helper: Option<Pubkey>,         // 1 + 32
    pub token_mint: Pubkey,             // 32 (expected USDC mint)
    pub amount: u64,                    // 8 (raw token units - USDC)
    pub inr_amount: u64,                // 8 (INR amount in paise, e.g., 100000 = ₹1000.00)
    pub status: u8,                     // 1 (0=Created,1=Joined,2=PaidLocal,3=Released,4=Disputed,5=Resolved)
    pub created_at: i64,                // 8
    pub expiry_ts: i64,                 // 8
    pub paid_at: Option<i64>,           // 1 + 8
    pub released_at: Option<i64>,       // 1 + 8
    pub receipt_hash: Option<[u8; 32]>, // 1 + 32
    pub fee_percentage: u8,             // 1 (0-100, representing percentage)
    pub arbiter: Pubkey,                // 32
    pub nonce: u64,                     // 8
    pub bump: u8,                       // 1
    pub qr_string: String,              // 4 + up to 500 (increased from 200)
}

impl Order {
    pub const LEN: usize = 8 + // discriminator
        32 + (1 + 32) + 32 + 8 + 8 + 1 + 8 + 8 + (1 + 8) + (1 + 8) + (1 + 32) + 1 + 32 + 8 + 1 + (4 + 500);
}
