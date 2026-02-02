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
  creator: string;
  helper: string | null;
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

export default function ExplorePage() {
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

  const formatAmount = (amount: BN) => {
    const usdcAmount = amount.toNumber() / 1_000_000;
    const inrAmount = Math.round(usdcAmount * 84);
    return {
      usdc: usdcAmount.toFixed(2),
      inr: inrAmount.toLocaleString('en-IN'),
    };
  };

  useEffect(() => {
    fetchAllRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet?.publicKey, connection]);

  const fetchAllRequests = async () => {
    if (!wallet) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const provider = new AnchorProvider(connection, wallet, {});
      const program = getProgram(provider);

      // Fetch order accounts with optimized filtering
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let allOrders: any[] = [];
      try {
        // Get the Order account discriminator (first 8 bytes of account data)
        const orderDiscriminator = Buffer.from([
          134, 173, 223, 185, 77, 86, 28, 51
        ]);

        // Fetch only Order accounts using memcmp filter for much faster loading
        const accounts = await connection.getProgramAccounts(program.programId, {
          filters: [
            {
              memcmp: {
                offset: 0,
                bytes: bs58.encode(orderDiscriminator), // Use base58 encoding for Solana
              },
            },
          ],
        });

        // Deserialize accounts in parallel for faster processing
        allOrders = await Promise.all(
          accounts.map(async ({ pubkey, account }) => {
            try {
              const decoded = program.coder.accounts.decode('order', account.data);
              return {
                publicKey: pubkey,
                account: decoded,
              };
            } catch {
              return null;
            }
          })
        ).then(results => results.filter(r => r !== null));
      } catch (error) {
        console.error("Error fetching program accounts:", error);
        allOrders = [];
      }

      const transformedRequests: PaymentRequest[] = allOrders
        .filter((order: Order) => {
          try {
            return order.account && order.account.creator && order.publicKey;
          } catch {
            return false;
          }
        })
        .map((order: Order) => {
          try {
            const amounts = formatAmount(order.account.amount);
            const status = getStatusFromCode(order.account.status, order.account.expiryTs);
            const expiryInfo = getExpiryInfo(order.account.expiryTs, order.account.status);

            return {
              id: order.publicKey.toString(),
              requestNumber: order.account.nonce.toString().padStart(6, '0'),
              amount: amounts.usdc,
              currency: 'USDC',
              inrAmount: amounts.inr,
              helperFee: `${order.account.feePercentage}%`,
              status,
              qrString: order.account.qrString,
              createdAt: new Date().toLocaleDateString(),
              expiryInfo,
              publicKey: order.publicKey,
              creator: order.account.creator.toString(),
              helper: order.account.helper?.toString() || null,
            };
          } catch (error) {
            console.error('Error transforming order:', error);
            return null;
          }
        })
        .filter((req: PaymentRequest | null): req is PaymentRequest => req !== null)
        .sort((a: PaymentRequest, b: PaymentRequest) => {
          const statusPriority: Record<string, number> = { pending: 0, completed: 1, expired: 2 };
          const aPriority = statusPriority[a.status];
          const bPriority = statusPriority[b.status];
          if (aPriority !== bPriority) return aPriority - bPriority;
          return parseInt(b.requestNumber) - parseInt(a.requestNumber);
        });

      setRequests(transformedRequests);
    } catch (error) {
      console.error('Error fetching all requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const filteredRequests = requests
    .filter(request => {
      const matchesSearch = 
        request.requestNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFilter = 
        filterStatus === "all" || request.status === filterStatus;
      
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === "latest") {
        // Sort by request number (nonce) - higher is more recent
        return parseInt(b.requestNumber) - parseInt(a.requestNumber);
      } else {
        // Sort by expiry time - lowest expiry first
        // Extract seconds from expiry info string or use a large number for completed/no expiry
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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-[#EDEDED]">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link 
                href="/"
                className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-[#F8F8F8] transition-colors text-[#111111]"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Back</span>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-[#111111]">Explore Requests</h1>
                <p className="text-[#666666] text-sm mt-1">Browse and join available payment requests</p>
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#999999]" />
              <input
                type="text"
                placeholder="Search by ID or status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-full border border-[#EDEDED] focus:outline-none focus:border-[#9FFFCB] transition-colors text-[#111111] placeholder:text-[#999999] bg-[#F8F8F8]"
              />
            </div>
            
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#999999] pointer-events-none" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as "all" | "pending" | "completed" | "expired")}
                className="pl-12 pr-8 py-3 rounded-full border border-[#EDEDED] focus:outline-none focus:border-[#9FFFCB] transition-colors text-[#111111] bg-[#F8F8F8] appearance-none cursor-pointer min-w-[150px]"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            <div className="relative">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#999999] pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "latest" | "expiry")}
                className="pl-12 pr-8 py-3 rounded-full border border-[#EDEDED] focus:outline-none focus:border-[#9FFFCB] transition-colors text-[#111111] bg-[#F8F8F8] appearance-none cursor-pointer min-w-[180px]"
              >
                <option value="latest">Latest Request</option>
                <option value="expiry">Lowest Expiry Time</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-12">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-[#9FFFCB] animate-spin mx-auto mb-4" />
              <p className="text-[#666666]">Loading requests...</p>
            </div>
          </div>
        ) : !wallet ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-md">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#BFFFE0]/20 to-[#E8E0FF]/20 border border-[#EDEDED] flex items-center justify-center">
                <XCircle className="w-12 h-12 text-[#999999]" />
              </div>
              <h2 className="text-2xl font-bold text-[#111111] mb-3">Connect Your Wallet</h2>
              <p className="text-[#666666] mb-6">
                Please connect your wallet to explore payment requests
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRequests.length === 0 ? (
              <div className="col-span-full">
                <div className="text-center py-20">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#BFFFE0]/20 to-[#E8E0FF]/20 border border-[#EDEDED] flex items-center justify-center">
                    <Search className="w-12 h-12 text-[#999999]" />
                  </div>
                  <h3 className="text-xl font-bold text-[#111111] mb-2">No requests found</h3>
                  <p className="text-[#666666]">
                    {searchQuery || filterStatus !== "all" 
                      ? "Try adjusting your search or filters" 
                      : "No payment requests available at the moment"}
                  </p>
                </div>
              </div>
            ) : (
              filteredRequests.map((request) => (
                <div
                  key={request.id}
                  className="group relative bg-white rounded-3xl border border-[#EDEDED] p-6 hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300"
                >
                  {/* Hover Gradient Effect */}
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#BFFFE0]/10 via-transparent to-[#E8E0FF]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Content */}
                  <div className="relative">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-xs text-[#999999] font-medium mb-1">Request #{request.requestNumber}</p>
                        <h3 className="text-2xl font-bold text-[#111111]">₹{request.inrAmount}</h3>
                        <p className="text-sm text-[#666666] mt-1">{request.amount} {request.currency}</p>
                      </div>
                      
                      {/* Status Badge */}
                      {request.status === "pending" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFE8A3] border border-[#FFD770] text-[#996A00] text-xs font-medium">
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

                    {/* Details Grid */}
                    <div className="space-y-3 mb-5">
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#BFFFE0]/20 to-[#E1F0FF]/20 border border-[#EDEDED]">
                        <div className="text-xs text-[#666666] mb-1 font-medium">Helper Fee</div>
                        <div className="text-lg font-bold text-[#111111]">{request.helperFee}</div>
                      </div>

                      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#E8E0FF]/20 to-[#FFF2E5]/20 border border-[#EDEDED]">
                        <div className="text-xs text-[#666666] mb-1 font-medium">Status</div>
                        <div className="text-sm font-medium text-[#111111]">{request.expiryInfo}</div>
                      </div>
                    </div>

                    {/* QR Code */}
                    <div className="mb-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-[#666666] font-medium">QR Code</span>
                        <button
                          onClick={() => copyToClipboard(request.qrString)}
                          className="text-[#9FFFCB] hover:text-[#7FFFB3] transition-colors p-1.5 rounded-lg hover:bg-[#F8F8F8]"
                          title="Copy QR string"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-xs text-[#999999] font-mono bg-[#F8F8F8] p-3 rounded-xl border border-[#EDEDED] truncate">
                        {request.qrString}
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
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Animations */}
      <style jsx>{`
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

        .animate-gradient-shift {
          animation: gradient-shift 4s ease infinite;
        }
      `}</style>
    </div>
  );
}
