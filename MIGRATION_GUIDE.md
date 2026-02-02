# Handling Incompatible Old Transactions

## Problem
Old requests created before the Solana program update have incompatible data structures and cannot be read by the new program version.

## Solutions Applied

### ✅ 1. Frontend Error Handling (Applied)
- Added graceful error handling in `my-requests.tsx`, `order-list.tsx`, and `request/[id]/page.tsx`
- Old incompatible accounts are now skipped instead of crashing the app
- Users see friendly error messages when encountering old requests

### 🔧 2. Clean Old Accounts (Manual - DevNet Only)

#### Option A: Start Fresh (Recommended for DevNet)
```bash
# 1. Stop validator
solana-test-validator --reset

# 2. Redeploy your program
anchor build
anchor deploy

# 3. Update program ID in your frontend
cp target/idl/peermint.json app/peermint-frontend/peermint.json
```

#### Option B: Add Close Instruction to Your Program
Add this to your Solana program to allow closing old accounts:

```rust
// In programs/peermint/src/lib.rs
pub fn close_old_order(ctx: Context<CloseOldOrder>) -> Result<()> {
    // Transfer remaining lamports to creator and close account
    Ok(())
}

#[derive(Accounts)]
pub struct CloseOldOrder<'info> {
    #[account(mut, close = creator)]
    pub order: Account<'info, Order>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
}
```

Then call it from frontend for each old account.

### 📝 3. Best Practices for Future Updates

1. **Version Your Accounts**: Add a `version` field to account structs
   ```rust
   pub struct Order {
       pub version: u8,  // Add this
       pub creator: Pubkey,
       // ... other fields
   }
   ```

2. **Migration Strategy**: Write migration instructions when updating data structures

3. **Use Program Upgrades Carefully**: On mainnet, ensure backward compatibility or plan account migrations

## Current Status
✅ Frontend now gracefully handles incompatible accounts
✅ New requests will work perfectly
⚠️  Old requests will be skipped/hidden from the UI

## Next Steps
1. Create new test requests with the updated program
2. (Optional) Run the cleanup script to identify old accounts: `npx ts-node scripts/clean-old-accounts.ts`
3. (Optional) Add a close instruction if you need to reclaim rent from old accounts
