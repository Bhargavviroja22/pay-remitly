import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WalletContextProvider } from "@/components/wallet-provider";
import Header from "@/components/header";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PeerMint - Travel Free. They Pay You Crypto.",
  description: "Seamless global travel payments powered by crypto, no borders, no banks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans antialiased bg-white`}
      >
        <WalletContextProvider>
          <Header />
          {children}
        </WalletContextProvider>
      </body>
    </html>
  );
}
