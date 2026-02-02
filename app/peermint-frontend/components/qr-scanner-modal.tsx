"use client";

import { useState, useEffect, useRef } from "react";
import { Camera, UploadCloud, X, CheckCircle2, Lock } from "lucide-react";
import QRScannerComponent from "./qr-scanner";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (result: string) => void;
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function QRScannerModal({ isOpen, onClose, onScan, onUpload }: QRScannerModalProps) {
  const [scanSuccess, setScanSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleScanSuccess = (result: string) => {
    setScanSuccess(true);
    setTimeout(() => {
      onScan(result);
      setScanSuccess(false);
      onClose();
    }, 1200);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Blurred Overlay */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="pointer-events-auto w-full max-w-[420px] animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Premium Glassmorphic Card */}
          <div className="relative rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.6)]">
            {/* Deep Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0B0B1A] to-[#141426]" />
            
            {/* Glass Inner Glow */}
            <div className="absolute inset-0 bg-white/5 backdrop-blur-[24px]" />
            
            {/* Glowing Edges */}
            <div className="absolute inset-0 rounded-3xl border border-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]" />
            
            {/* Neon Accent Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#00D09C]/5 via-transparent to-[#C084FC]/5" />
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 text-white/40 hover:text-white hover:bg-white/10 hover:scale-110"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Content Container */}
            <div className="relative z-10 p-8">
              {/* Header */}
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <Camera className="w-6 h-6 text-[#00D09C]" />
                  <h2 
                    className="text-[20px] font-semibold text-[#E5E7EB] tracking-wide" 
                    style={{ fontFamily: 'Inter, Poppins, sans-serif', fontWeight: 600 }}
                  >
                    Scan QR Code
                  </h2>
                </div>
                <p className="text-sm text-[#9CA3AF]">
                  Scan your UPI or Wallet QR code securely.
                </p>
              </div>

              {/* Camera Preview Square Frame */}
              <div className="relative aspect-square rounded-3xl overflow-hidden mb-6">
                {/* Gradient Border with Glow */}
                <div className="absolute inset-0 rounded-3xl p-[2px] bg-gradient-to-r from-[#00D09C] via-[#6EE7B7] to-[#C084FC]">
                  <div className="absolute inset-0 rounded-3xl shadow-[0_0_20px_rgba(0,208,156,0.3)]" />
                </div>
                
                {/* Inner Frame */}
                <div className="absolute inset-[2px] rounded-3xl overflow-hidden bg-black">
                  {/* Scanning Line Animation */}
                  <div className="absolute inset-0 z-10 pointer-events-none">
                    <div className="scanning-line absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#00D09C] to-transparent shadow-[0_0_15px_rgba(0,209,156,0.8)]" />
                  </div>

                  {/* Success Animation */}
                  {scanSuccess && (
                    <div className="absolute inset-0 z-30 bg-[#00D09C]/30 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
                      <div className="w-24 h-24 bg-[#00D09C] rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(0,209,156,0.8)] animate-scale-bounce mb-4">
                        <CheckCircle2 className="w-16 h-16 text-white" />
                      </div>
                      <p className="text-white text-lg font-semibold">QR Recognized!</p>
                    </div>
                  )}

                  {/* Pulse Border Animation */}
                  <div className={`absolute inset-0 rounded-3xl border-2 border-[#00D09C] ${scanSuccess ? 'animate-ping' : 'animate-pulse-border'}`} />

                  {/* Scanner Component */}
                  <div className="relative w-full h-full">
                    <QRScannerComponent 
                      onScan={handleScanSuccess} 
                      onClose={onClose}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Capture & Scan Button */}
                <button
                  className="group relative px-6 py-4 rounded-2xl font-bold text-white shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition-all duration-300 hover:scale-105 overflow-hidden"
                >
                  {/* Gradient Background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#00D09C] to-[#3B82F6]" />
                  {/* Hover Glow */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-[#00D09C]/30 shadow-[0_0_30px_rgba(0,209,156,0.6)] transition-opacity duration-300" />
                  {/* Content */}
                  <div className="relative flex items-center justify-center gap-2">
                    <Camera className="w-5 h-5" />
                    <span>Capture</span>
                  </div>
                </button>

                {/* Upload Button */}
                <button
                  onClick={handleUploadClick}
                  className="group relative px-6 py-4 rounded-2xl font-bold text-white shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition-all duration-300 hover:scale-105 overflow-hidden"
                >
                  {/* Gradient Background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#C084FC] to-[#9333EA]" />
                  {/* Hover Glow */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-[#9333EA]/30 shadow-[0_0_30px_rgba(147,51,234,0.6)] transition-opacity duration-300" />
                  {/* Content */}
                  <div className="relative flex items-center justify-center gap-2">
                    <UploadCloud className="w-5 h-5" />
                    <span>Upload</span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={onUpload}
                    className="hidden"
                  />
                </button>
              </div>

              {/* Security Footer */}
              <div className="flex items-center justify-center gap-2 text-xs text-[#9CA3AF] bg-white/5 rounded-xl py-3 px-4 border border-white/10">
                <Lock className="w-3.5 h-3.5 text-[#00D09C]" />
                <span>Your QR code data stays private — processed locally in your browser</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scan {
          0%, 100% {
            transform: translateY(0);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
        }

        .scanning-line {
          animation: scan 2s ease-in-out infinite;
          height: 2px;
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes scale-bounce {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes pulse-border {
          0%, 100% {
            box-shadow: 0 0 20px rgba(0, 208, 156, 0.3), 0 0 40px rgba(0, 208, 156, 0.1);
          }
          50% {
            box-shadow: 0 0 30px rgba(0, 208, 156, 0.5), 0 0 60px rgba(0, 208, 156, 0.2);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }

        .animate-scale-bounce {
          animation: scale-bounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .animate-pulse-border {
          animation: pulse-border 1.5s ease-in-out infinite;
        }

        @media (max-width: 640px) {
          .grid-cols-1.sm\\:grid-cols-2 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
