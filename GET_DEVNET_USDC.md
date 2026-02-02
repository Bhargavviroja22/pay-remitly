# How to Get Devnet USDC for Testing

## Problem
You're seeing: **"insufficient funds"** or **"custom program error: 0x1"**

This means you need devnet USDC tokens in your wallet.

## Solution: Get Devnet USDC

### Option 1: Use SPL Token Faucet (Easiest)

1. **Get Devnet SOL first:**
   ```bash
   solana airdrop 2
   ```

2. **Create USDC token account and mint tokens:**
   ```bash
   # Your devnet USDC mint address (from your code)
   USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
   
   # Get your wallet address
   YOUR_WALLET=$(solana address)
   
   # Create token account (if not exists)
   spl-token create-account $USDC_MINT
   
   # Mint some test USDC (this will fail on devnet, see Option 2)
   ```

### Option 2: Create Your Own Test USDC (Recommended for Devnet)

Since the USDC mint on devnet might not allow public minting, create your own test token:

```bash
# 1. Create a new token (your own test USDC)
spl-token create-token --decimals 6

# Output will be something like: Creating token ABC123...
# Save this token address!

# 2. Create token account for yourself
spl-token create-account <YOUR_TOKEN_ADDRESS>

# 3. Mint tokens to yourself (1000 USDC with 6 decimals)
spl-token mint <YOUR_TOKEN_ADDRESS> 1000

# 4. Check balance
spl-token balance <YOUR_TOKEN_ADDRESS>
```

### Option 3: Update Your Code to Use Your Own Token

1. **Create your test token** (see Option 2)

2. **Update your frontend code:**
   ```typescript
   // In lib/anchor.ts
   export const USDC_MINT = new PublicKey("YOUR_NEW_TOKEN_ADDRESS");
   ```

3. **Restart your dev server**

## Verify You Have USDC

```bash
# Check all your token accounts
spl-token accounts

# Check specific token balance
spl-token balance 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```

## Quick Test Script

Save this as `mint-test-usdc.sh`:

```bash
#!/bin/bash

echo "🪙 Setting up test USDC on Solana Devnet..."

# Airdrop SOL
echo "1. Airdropping SOL..."
solana airdrop 2

# Create test token
echo "2. Creating test USDC token..."
TOKEN=$(spl-token create-token --decimals 6 2>&1 | grep "Creating token" | awk '{print $3}')
echo "   Token created: $TOKEN"

# Create account
echo "3. Creating token account..."
spl-token create-account $TOKEN

# Mint tokens
echo "4. Minting 10,000 test USDC..."
spl-token mint $TOKEN 10000

# Show balance
echo "5. Your balance:"
spl-token balance $TOKEN

echo ""
echo "✅ Done! Update your code with this token address:"
echo "   export const USDC_MINT = new PublicKey(\"$TOKEN\");"
```

Make it executable and run:
```bash
chmod +x mint-test-usdc.sh
./mint-test-usdc.sh
```

## Current Status

Your app is using:
- **USDC Mint:** `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
- **Network:** Devnet

Make sure you have tokens at this address, or create your own test token!
