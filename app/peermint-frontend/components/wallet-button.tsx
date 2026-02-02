/* eslint-disable */
"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";

export default function WalletButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="wallet-adapter-button wallet-adapter-button-trigger">
        <span className="wallet-adapter-button-start-icon" />
        Select Wallet
      </div>
    );
  }

  return <WalletMultiButton />;
}
