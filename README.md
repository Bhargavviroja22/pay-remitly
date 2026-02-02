<<<<<<< HEAD
# pay-remitly
Pay-Remitly is a peer-to-peer escrow platform built on Solana that enables seamless conversion between Indian Rupees (INR) and USDC stablecoin. Users can create payment requests with UPI/payment details, and helpers fulfill these requests by providing INR liquidity in exchange for USDC + a helper fee.
=======
# 🪙 PeerMint

**Decentralized P2P INR-USDC Exchange on Solana**

PeerMint is a peer-to-peer escrow platform built on Solana that enables seamless conversion between Indian Rupees (INR) and USDC stablecoin. Users can create payment requests with UPI/payment details, and helpers fulfill these requests by providing INR liquidity in exchange for USDC + a helper fee.

![Solana](https://img.shields.io/badge/Solana-Devnet-9945FF?style=for-the-badge&logo=solana)
![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![Anchor](https://img.shields.io/badge/Anchor-0.30-purple?style=for-the-badge)

## 🌟 Features

### For Request Creators
- **Create Payment Requests**: Request INR for your USDC with customizable expiry times
- **QR Code Support**: Upload or scan UPI QR codes for payment details
- **Automatic Escrow**: Your USDC is locked securely in a program-controlled escrow
- **Track Requests**: Monitor all your active and completed requests in real-time
- **Release Funds**: Simple one-click release after receiving INR payment

### For Helpers (Liquidity Providers)
- **Browse Requests**: Explore available payment requests with filtering and sorting
- **Earn Fees**: Get paid 1% helper fee on top of the USDC amount
- **Instant Payments**: Receive USDC + fee immediately after fund release
- **Low Risk**: Escrow mechanism protects both parties

### Platform Features
- 🔒 **Secure Escrow**: Smart contract-managed funds with no intermediaries
- ⚡ **Fast Transactions**: Leverage Solana's speed for near-instant settlements
- 💰 **Transparent Fees**: Fixed 1% helper fee displayed upfront
- 📱 **Mobile Responsive**: Works seamlessly on desktop and mobile devices
- 🎨 **Modern UI**: Beautiful pastel-themed interface with smooth animations
- 🔍 **Advanced Filtering**: Sort by latest requests or lowest expiry time

## 🏗️ Architecture

### Smart Contract (Rust + Anchor)
```
programs/peermint/
├── src/
│   ├── lib.rs                    # Program entry point
│   ├── state.rs                  # Order account structure
│   ├── errors.rs                 # Custom error definitions
│   └── instructions/
│       ├── create_request.rs     # Create payment request
│       ├── join_request.rs       # Helper joins request
│       ├── mark_paid.rs          # Mark local payment done
│       ├── acknowledge_and_release.rs  # Release USDC to helper
│       └── dispute.rs            # Handle disputes
```

### Frontend (Next.js + TypeScript)
```
app/peermint-frontend/
├── app/
│   ├── page.tsx                  # Landing page
│   ├── create/page.tsx           # Create request page
│   ├── explore/page.tsx          # Browse requests
│   ├── my-requests/page.tsx      # User's requests
│   └── request/[id]/page.tsx     # Request details
├── components/
│   ├── header.tsx                # Navigation header
│   ├── wallet-provider.tsx       # Solana wallet setup
│   └── qr-scanner-modal.tsx      # QR code scanner
└── lib/
    └── anchor.ts                 # Anchor program setup
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Rust 1.75+
- Solana CLI 1.18+
- Anchor 0.30.0+
- A Solana wallet (Phantom, Backpack, etc.)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/AbhimanyuAjudiya/PeerMint.git
   cd peermint
   ```

2. **Install Solana CLI**
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
   ```

3. **Install Anchor**
   ```bash
   cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
   avm install 0.30.0
   avm use 0.30.0
   ```

4. **Build the smart contract**
   ```bash
   anchor build
   ```

5. **Deploy to Devnet**
   ```bash
   # Configure Solana for devnet
   solana config set --url devnet
   
   # Get some SOL for deployment
   solana airdrop 2
   
   # Deploy the program
   anchor deploy
   ```

6. **Install frontend dependencies**
   ```bash
   cd app/peermint-frontend
   npm install
   ```

7. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your program ID
   ```

8. **Run the development server**
   ```bash
   npm run dev
   ```

9. **Open in browser**
   ```
   http://localhost:3000
   ```

## 🎮 Usage

### Creating a Request

1. Connect your Solana wallet
2. Navigate to "Create Request"
3. Enter the INR amount you want to receive
4. Upload/scan your UPI QR code or enter payment details
5. Review the helper fee (1% of requested amount)
6. Confirm the transaction - your USDC will be locked in escrow

### Helping Others (Earning USDC)

1. Browse available requests in "Explore"
2. Filter by latest or expiring soon
3. Click "Join Request" on a suitable request
4. Pay the INR amount via UPI using the provided QR code
5. Click "Mark as Paid" after making the payment
6. Wait for the creator to confirm and release funds
7. Receive USDC + helper fee automatically

## 📊 Program Details

- **Program ID**: `2rQAwzmXe4vXLCHAcVbEzqDU5i5mPkKoRp5tdPqYUWyS`
- **Network**: Solana Devnet
- **USDC Mint**: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (Devnet)
- **Helper Fee**: 1% (fixed)
- **Exchange Rate**: ~83 INR per USDC (displayed for reference)

## 🔧 Technology Stack

### Smart Contract
- **Language**: Rust
- **Framework**: Anchor 0.30.0
- **Blockchain**: Solana (Devnet)
- **Token Standard**: SPL Token (USDC)

### Frontend
- **Framework**: Next.js 16.0.1
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Wallet Adapter**: @solana/wallet-adapter-react
- **QR Code**: qrcode + qr-scanner libraries
- **State Management**: React Hooks

### Key Libraries
- `@coral-xyz/anchor` - Anchor TypeScript client
- `@solana/web3.js` - Solana JavaScript API
- `@solana/spl-token` - SPL Token program interactions
- `bs58` - Base58 encoding for Solana addresses
- `bn.js` - Big number handling for token amounts

## 🛡️ Security Features

- ✅ **Escrow Protection**: Funds locked in program-controlled accounts
- ✅ **PDA Verification**: Program Derived Addresses prevent unauthorized access
- ✅ **Amount Validation**: Input sanitization and overflow protection
- ✅ **Status Checks**: State machine prevents invalid transitions
- ✅ **Expiry Mechanism**: Automatic expiration prevents fund lock-ups
- ✅ **Dispute Resolution**: Built-in arbiter system for conflicts

## 📈 Order Lifecycle

```
1. CREATED (Status: 0)
   ↓ Helper joins
2. JOINED (Status: 1)
   ↓ Helper pays INR and marks paid
3. PAID_LOCAL (Status: 2)
   ↓ Creator confirms and releases funds
4. RELEASED (Status: 3) ✅ Complete
   
   OR
   
   ↓ Dispute raised
5. DISPUTED (Status: 4)
   ↓ Arbiter resolves
6. RESOLVED (Status: 5) ✅ Complete
```

## 🔍 Account Structure

### Order Account (1048 bytes)
```rust
pub struct Order {
    pub creator: Pubkey,           // Request creator (32 bytes)
    pub helper: Option<Pubkey>,    // Helper who joined (33 bytes)
    pub token_mint: Pubkey,        // USDC mint address (32 bytes)
    pub amount: u64,               // Base USDC amount (8 bytes)
    pub inr_amount: u64,           // INR amount in paise (8 bytes)
    pub status: u8,                // Order status (1 byte)
    pub created_at: i64,           // Creation timestamp (8 bytes)
    pub expiry_ts: i64,            // Expiry timestamp (8 bytes)
    pub paid_at: Option<i64>,      // Payment timestamp (9 bytes)
    pub released_at: Option<i64>,  // Release timestamp (9 bytes)
    pub receipt_hash: Option<[u8; 32]>, // Payment receipt (33 bytes)
    pub fee_percentage: u8,        // Helper fee % (1 byte)
    pub arbiter: Pubkey,           // Dispute arbiter (32 bytes)
    pub nonce: u64,                // Unique nonce (8 bytes)
    pub bump: u8,                  // PDA bump seed (1 byte)
    pub qr_string: String,         // UPI details (max 500 bytes)
}
```

## 🎯 Roadmap

- [ ] Mainnet deployment
- [ ] Multi-currency support (other fiat currencies)
- [ ] Reputation system for helpers
- [ ] In-app chat for coordination
- [ ] Automated dispute resolution via oracle
- [ ] Mobile app (React Native)
- [ ] Integration with more wallets
- [ ] Advanced analytics dashboard

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Abhimanyu Ajudiya**
- GitHub: [@AbhimanyuAjudiya](https://github.com/AbhimanyuAjudiya)

## 🙏 Acknowledgments

- Built with [Anchor Framework](https://www.anchor-lang.com/)
- Powered by [Solana](https://solana.com/)
- UI inspired by modern Web3 design principles
- Thanks to the Solana and Anchor communities

## 📞 Support

For support, questions, or feedback:
- Open an issue on GitHub
- Reach out via GitHub discussions

---

**⚠️ Disclaimer**: This project is currently on Solana Devnet for testing purposes. Do not use with real funds on mainnet without proper auditing and security review.

Made with ❤️ using Solana and Anchor
>>>>>>> dcdcc29 (Initial commit)
