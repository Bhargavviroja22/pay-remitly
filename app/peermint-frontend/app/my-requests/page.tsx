"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Search, Filter, Copy, ExternalLink, CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { getProgram } from "@/lib/anchor";
import { PublicKey } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import BN from "bn.js";
import bs58 from "bs58";

interface PaymentRequest {
  id: string;
  requestNumber: string;
  amount: string;
  currency: string;
  inrAmount: string;
  helperFee: string;
  status: "pending" | "completed" | "expired";
  qrString: string;
  createdAt: string;
  expiryInfo: string;
  publicKey: PublicKey;
}

interface Order {
  publicKey: PublicKey;
  account: {
    creator: PublicKey;
    helper: PublicKey | null;
    amount: BN;
    feePercentage: number;
    expiryTs: BN | number;
    qrString: string;
    status: number;
    nonce: BN;
  };
}

export default function MyRequestsPage() {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "completed" | "expired">("all");
  const [sortBy, setSortBy] = useState<"latest" | "expiry">("latest");

  const getStatusFromCode = (statusCode: number, expiryTs: BN | number | undefined): "pending" | "completed" | "expired" => {
    // Status: 0=Created, 1=Joined, 2=PaidLocal, 3=Released (completed), 4=Disputed, 5=Resolved
    if (statusCode === 3 || statusCode === 5) return "completed"; // Released or Resolved

    // Check if expired
    if (expiryTs) {
      const expiryTimestamp = typeof expiryTs === 'number' ? expiryTs : expiryTs.toNumber();
      const now = Math.floor(Date.now() / 1000);
      if (expiryTimestamp <= now && statusCode < 3) return "expired";
    }

    return "pending"; // 0=Created, 1=Joined, 2=PaidLocal, 4=Disputed
  };

  const getExpiryInfo = (expiry: BN | number | undefined, status: number): string => {
    // If completed or resolved, show that
    if (status === 3 || status === 5) return "Completed";
    if (!expiry) return "No expiry";

    let expiryTimestamp = typeof expiry === 'number' ? expiry : expiry.toNumber();

    // Check if timestamp is in milliseconds (> year 2100 in seconds)
    if (expiryTimestamp > 4102444800) {
      expiryTimestamp = Math.floor(expiryTimestamp / 1000);
    }

    const now = Math.floor(Date.now() / 1000);

    if (expiryTimestamp <= now) return "Expired";

    const secondsLeft = expiryTimestamp - now;
    const daysLeft = Math.floor(secondsLeft / 86400);

    if (daysLeft > 1) return `${daysLeft} days left`;
    if (daysLeft === 1) return "1 day left";

    const hoursLeft = Math.floor(secondsLeft / 3600);
    if (hoursLeft > 1) return `${hoursLeft} hours left`;
    if (hoursLeft === 1) return "1 hour left";

    const minutesLeft = Math.floor(secondsLeft / 60);
    if (minutesLeft > 1) return `${minutesLeft} minutes left`;
    return "Less than 1 minute";
  };

  const formatAmount = (amount: BN): { usdc: string; inr: string } => {
    // Convert lamports to USDC (6 decimals)
    const usdcAmount = amount.toNumber() / 1_000_000;
    // Approximate INR conversion (1 USDC ≈ 84 INR)
    const inrAmount = Math.round(usdcAmount * 84);

    return {
      usdc: usdcAmount.toFixed(2),
      inr: inrAmount.toLocaleString()
    };
  };

  const fetchMyRequests = async () => {
    if (!wallet) {
      setRequests([]);
      return;
    }

    try {
      setLoading(true);
      const provider = new AnchorProvider(connection, wallet, {});
      const program = getProgram(provider);

      // Fetch order accounts with optimized filtering
      let myOrdersList: Order[] = [];
      try {
        // Get the Order account discriminator (first 8 bytes)
        const orderDiscriminator = Buffer.from([
          134, 173, 223, 185, 77, 86, 28, 51
        ]);

        // Creator public key is at offset 8 (after discriminator)
        // Fetch only Order accounts created by current wallet for much faster loading
        const accounts = await connection.getProgramAccounts(program.programId, {
          filters: [
            {
              memcmp: {
                offset: 0,
                bytes: bs58.encode(orderDiscriminator), // Use base58 encoding
              },
            },
            {
              memcmp: {
                offset: 8, // After discriminator (8 bytes)
                bytes: wallet.publicKey.toBase58(),
              },
            },
          ],
        });

        // Deserialize accounts in parallel for faster processing
        myOrdersList = await Promise.all(
          accounts.map(async ({ pubkey, account }) => {
            try {
              const decoded = program.coder.accounts.decode('order', account.data);
              return {
                publicKey: pubkey,
                account: decoded,
              } as Order;
            } catch {
              return null;
            }
          })
        ).then(results => results.filter((r): r is Order => r !== null));
      } catch (error) {
        console.error("Error fetching program accounts:", error);
        myOrdersList = [];
      }

      // Transform to PaymentRequest format
      const transformedRequests: PaymentRequest[] = myOrdersList.map((order) => {
        const amounts = formatAmount(order.account.amount);
        const status = getStatusFromCode(order.account.status, order.account.expiryTs);

        return {
          id: order.publicKey.toString(),
          requestNumber: order.account.nonce.toString().padStart(6, '0'),
          amount: amounts.usdc,
          currency: "USDC",
          inrAmount: amounts.inr,
          helperFee: `${order.account.feePercentage}%`,
          status,
          qrString: order.account.qrString,
          createdAt: new Date().toISOString().split('T')[0], // We don't store creation time on-chain
          expiryInfo: getExpiryInfo(order.account.expiryTs, order.account.status),
          publicKey: order.publicKey
        };
      });

      // Sort by status (pending first, then completed, then expired) and by nonce (newest first)
      transformedRequests.sort((a, b) => {
        const statusOrder = { pending: 0, completed: 1, expired: 2 };
        const statusDiff = statusOrder[a.status] - statusOrder[b.status];
        if (statusDiff !== 0) return statusDiff;
        return parseInt(b.requestNumber) - parseInt(a.requestNumber);
      });

      setRequests(transformedRequests);
    } catch (error) {
      console.error("Error fetching my requests:", error);
      if (error instanceof Error && error.message.includes("failed to deserialize")) {
        console.warn("Some old requests are incompatible with the current program version.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet?.publicKey]);

  const truncateString = (str: string, maxLength: number = 40) => {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + "...";
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Optional: Show a toast notification
  };

  const filteredRequests = requests
    .filter(req => {
      const matchesSearch = req.requestNumber.includes(searchQuery) ||
        req.status.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterStatus === "all" || req.status === filterStatus;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === "latest") {
        // Sort by request number (nonce) - higher is more recent
        return parseInt(b.requestNumber) - parseInt(a.requestNumber);
      } else {
        // Sort by expiry time - lowest expiry first
        const getExpirySeconds = (req: PaymentRequest): number => {
          if (req.status === "completed" || req.expiryInfo === "Completed") return Infinity;
          if (req.expiryInfo === "No expiry") return Infinity;
          if (req.expiryInfo === "Expired") return 0;

          // Parse time strings like "5 minutes left", "2 hours left", "3 days left"
          const match = req.expiryInfo.match(/(\d+)\s+(minute|hour|day)/);
          if (match) {
            const value = parseInt(match[1]);
            const unit = match[2];
            if (unit === "minute") return value * 60;
            if (unit === "hour") return value * 3600;
            if (unit === "day") return value * 86400;
          }
          return Infinity;
        };

        return getExpirySeconds(a) - getExpirySeconds(b);
      }
    });

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Floating Background Shapes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-96 h-96 bg-[#BFFFE0] rounded-full opacity-10 blur-3xl" />
        <div className="absolute top-40 right-20 w-80 h-80 bg-[#E8E0FF] rounded-full opacity-10 blur-3xl" />
        <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-[#E1F0FF] rounded-full opacity-10 blur-3xl" />
        <div className="absolute bottom-40 right-1/4 w-64 h-64 bg-[#FFF2E5] rounded-full opacity-10 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[#666666] hover:text-[#00D09C] transition-colors duration-300 mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" />
          <span className="text-sm font-medium">Home</span>
        </Link>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#111111] mb-3">
            My Requests
          </h1>
          <p className="text-[#666666] text-lg">
            View and manage your payment requests securely.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-sm text-[#666666]">
            <span className="font-semibold text-[#111111]">{filteredRequests.length}</span>
            <span>Requests Found</span>
          </div>
        </div>

        {/* Filters & Search Bar (Sticky) */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md shadow-[0_2px_20px_rgba(0,0,0,0.05)] rounded-2xl p-4 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search by ID or Status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-11 rounded-xl border border-[#EDEDED] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] focus:outline-none focus:ring-2 focus:ring-[#9FFFCB] focus:border-transparent transition-all text-[#111111] placeholder-[#999999]"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999999]" />
            </div>

            {/* Filter Dropdown */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as "all" | "pending" | "completed" | "expired")}
                className="appearance-none px-6 py-3 pr-10 rounded-xl border border-[#EDEDED] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] focus:outline-none focus:ring-2 focus:ring-[#9FFFCB] focus:border-transparent transition-all text-[#111111] cursor-pointer font-medium"
              >
                <option value="all">All Requests</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="expired">Expired</option>
              </select>
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999999] pointer-events-none" />
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "latest" | "expiry")}
                className="appearance-none px-6 py-3 pr-10 rounded-xl border border-[#EDEDED] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] focus:outline-none focus:ring-2 focus:ring-[#9FFFCB] focus:border-transparent transition-all text-[#111111] cursor-pointer font-medium"
              >
                <option value="latest">Latest Request</option>
                <option value="expiry">Lowest Expiry Time</option>
              </select>
              <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999999] pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-[#00D09C] animate-spin mb-4" />
            <p className="text-[#666666] text-lg">Loading your requests...</p>
          </div>
        )}

        {/* Wallet Not Connected */}
        {!wallet && !loading && (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#BFFFE0]/20 to-[#E8E0FF]/20 border border-[#EDEDED] flex items-center justify-center">
              <Clock className="w-12 h-12 text-[#999999]" />
            </div>
            <h3 className="text-2xl font-bold text-[#111111] mb-3">Connect Your Wallet</h3>
            <p className="text-[#666666] mb-8 max-w-md mx-auto">
              Please connect your Solana wallet to view your payment requests.
            </p>
          </div>
        )}

        {/* Request Cards Grid */}
        {!loading && wallet && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRequests.map((request, index) => (
              <div
                key={request.id}
                className="group relative p-6 rounded-3xl bg-white/80 backdrop-blur-sm border border-[#F2F2F2] shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_20px_rgba(140,255,200,0.2)] hover:scale-[1.02] transition-all duration-300 ease-in-out"
                style={{
                  animation: `fadeInUp 0.5s ease-out ${index * 0.08}s both`
                }}
              >
                {/* Pastel Gradient Overlay */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#BFFFE0]/10 via-transparent to-[#E8E0FF]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Top Row - Request ID & Status */}
                <div className="relative flex items-start justify-between mb-5">
                  <div className="text-sm font-semibold text-[#555555]">
                    #{request.requestNumber}
                  </div>
                  <div>
                    {request.status === "pending" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFE8A3] border border-[#FFD770] text-[#996A00] text-xs font-medium animate-pulse-glow">
                        <Clock className="w-3 h-3" />
                        Pending
                      </span>
                    ) : request.status === "completed" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#CFF8D8] border border-[#9EF0B3] text-[#00662E] text-xs font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        Completed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFD6D6] border border-[#FFAAAA] text-[#CC0000] text-xs font-medium">
                        <XCircle className="w-3 h-3" />
                        Expired
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle Section - 3 Column Data */}
                <div className="relative grid grid-cols-3 gap-3 mb-5">
                  {/* Helper Pays (INR/USDC) */}
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-[#BFFFE0]/20 to-[#E1F0FF]/20 border border-[#EDEDED]">
                    <div className="text-xs text-[#666666] mb-1.5 font-medium">
                      Amount
                    </div>
                    <div className="text-sm font-bold text-[#111111] mb-0.5">
                      ₹{request.inrAmount}
                    </div>
                    <div className="text-xs text-[#999999]">
                      {request.amount} {request.currency}
                    </div>
                  </div>

                  {/* Helper Fee */}
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-[#E8E0FF]/20 to-[#FFF2E5]/20 border border-[#EDEDED]">
                    <div className="text-xs text-[#666666] mb-1.5 font-medium">
                      Fee
                    </div>
                    <div className="text-sm font-bold text-[#111111] mb-0.5">
                      {request.helperFee}
                    </div>
                    <div className="text-xs text-[#999999]">
                      Commission
                    </div>
                  </div>

                  {/* Expiry */}
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-[#E1F0FF]/20 to-[#BFFFE0]/20 border border-[#EDEDED]">
                    <div className="text-xs text-[#666666] mb-1.5 font-medium">
                      Expiry
                    </div>
                    <div className="text-sm font-bold text-[#111111] mb-0.5">
                      {request.expiryInfo}
                    </div>
                    <div className="text-xs text-[#999999]">
                      Time left
                    </div>
                  </div>
                </div>

                {/* Payment QR */}
                <div className="relative mb-5">
                  <div className="text-xs text-[#666666] mb-2 font-medium">
                    Payment QR
                  </div>
                  <div className="flex items-center gap-2 px-4 py-3 bg-[#F8F8F8] border border-[#EDEDED] rounded-xl">
                    <div className="flex-1 text-xs text-[#999999] font-mono truncate">
                      {truncateString(request.qrString, 28)}
                    </div>
                    <button
                      onClick={() => copyToClipboard(request.qrString)}
                      className="text-[#00D09C] hover:text-[#00B982] transition-colors"
                      title="Copy QR string"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Action Button */}
                <Link
                  href={`/request/${request.id}`}
                  className="group/btn relative w-full px-5 py-3.5 rounded-full font-semibold text-[#111111] shadow-lg overflow-hidden transition-all duration-300 hover:shadow-[0_8px_24px_rgba(140,255,200,0.3)] block"
                >
                  {/* Animated Pastel Gradient Background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#BFFFE0] via-[#9FFFCB] to-[#E8E0FF] bg-[length:200%_100%] group-hover/btn:animate-gradient-shift" />
                  {/* Content */}
                  <div className="relative flex items-center justify-center gap-2 text-sm font-bold">
                    <span>View Details</span>
                    <ExternalLink className="w-4 h-4" />
                  </div>
                </Link>
              </div>
            ))}

            {/* Empty State (show when no requests) */}
            {filteredRequests.length === 0 && (
              <div className="col-span-full text-center py-20">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#BFFFE0]/20 to-[#E8E0FF]/20 border border-[#EDEDED] flex items-center justify-center">
                  <Clock className="w-12 h-12 text-[#999999]" />
                </div>
                <h3 className="text-2xl font-bold text-[#111111] mb-3">No Requests Found</h3>
                <p className="text-[#666666] mb-8 max-w-md mx-auto">
                  {searchQuery || filterStatus !== "all"
                    ? "Try adjusting your search or filters."
                    : "Create your first payment request to get started."}
                </p>
                {!searchQuery && filterStatus === "all" && (
                  <Link
                    href="/create"
                    className="inline-block px-8 py-4 bg-gradient-to-r from-[#BFFFE0] to-[#E8E0FF] rounded-full text-[#111111] font-bold hover:scale-105 hover:shadow-[0_8px_24px_rgba(140,255,200,0.3)] transition-all duration-300"
                  >
                    Create Request
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes gradient-shift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 8px rgba(255, 215, 112, 0.3);
          }
          50% {
            box-shadow: 0 0 16px rgba(255, 215, 112, 0.6);
          }
        }

        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }

        .animate-scale-in {
          animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .animate-gradient-shift {
          animation: gradient-shift 4s ease infinite;
        }

        .animate-pulse-glow {
          animation: pulse-glow 2.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
