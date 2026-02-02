use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Invalid fee")]
    InvalidFee,
    #[msg("Order is not in expected state")]
    InvalidStatus,
    #[msg("Not authorized")]
    Unauthorized,
    #[msg("No helper set")]
    NoHelper,
    #[msg("Order not expired yet")]
    NotExpired,
    #[msg("Invalid outcome")]
    InvalidOutcome,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("QR string too long")]
    QRTooLong,
}
