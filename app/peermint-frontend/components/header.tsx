"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Coins } from "lucide-react";
import { useState } from "react";
import WalletButton from "./wallet-button";

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/create", label: "Create" },
    { href: "/my-requests", label: "My Requests" },
    { href: "/explore", label: "Explore" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200/30 bg-white backdrop-blur-xl">
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-[#8FFF73] to-[#E8E0FF] rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-lg flex items-center justify-center">
              <Coins className="w-6 h-6 text-[#0D0D0D]" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-[#0D0D0D] to-[#1a1a1a] bg-clip-text text-transparent">
              PeerMint
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`font-medium transition-all duration-300 relative group ${
                  pathname === link.href
                    ? "text-[#10b981]"
                    : "text-gray-700 hover:text-[#10b981]"
                }`}
              >
                {link.label}
                <span
                  className={`absolute -bottom-1 left-0 h-0.5 bg-gradient-to-r from-[#8FFF73] to-[#10b981] transition-all duration-300 ${
                    pathname === link.href ? "w-full" : "w-0 group-hover:w-full"
                  }`}
                ></span>
              </Link>
            ))}
          </div>

          {/* Wallet Button - Desktop */}
          <div className="hidden md:block">
            <WalletButton />
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-gray-200 pt-4 animate-fade-in">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`font-medium px-4 py-2 rounded-lg transition-all ${
                    pathname === link.href
                      ? "bg-gradient-to-r from-[#E9FCD4] to-[#D1FAE5] text-[#10b981]"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="px-4 pt-2">
                <WalletButton />
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
