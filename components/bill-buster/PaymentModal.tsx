"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { calculateFee, formatUSD, type PaymentStatus } from "@/lib/types/payment";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentComplete: () => void;
  savingsAmount: number;
}

export default function PaymentModal({
  isOpen,
  onClose,
  onPaymentComplete,
  savingsAmount,
}: PaymentModalProps) {
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const feeAmount = calculateFee(savingsAmount);

  const handlePayment = useCallback(async () => {
    setStatus("processing");
    setError(null);

    try {
      // Mock payment API call
      const response = await fetch("/api/bill-buster/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId: crypto.randomUUID(),
          feeAmount,
          savingsAmount,
          // In real implementation, would include wallet address
          walletAddress: "0x" + "0".repeat(40),
        }),
      });

      if (!response.ok) {
        throw new Error("Payment failed");
      }

      setStatus("success");

      // Auto-advance after success
      setTimeout(() => {
        onPaymentComplete();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
      setStatus("error");
    }
  }, [feeAmount, savingsAmount, onPaymentComplete]);

  const handleRetry = () => {
    setStatus("idle");
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={status === "idle" ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#E5E7EB]">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#17270C]">
              Complete Your Analysis
            </h2>
            {status === "idle" && (
              <button
                onClick={onClose}
                className="p-2 text-[#6B7280] hover:text-[#17270C] transition-colors rounded-lg hover:bg-[#F2FBEF]"
                aria-label="Close"
              >
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {status === "success" ? (
            <div className="text-center py-8">
              <div className="size-16 bg-[#F2FBEF] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="size-8 text-[#5A9A6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[#17270C] mb-2">Payment Complete</h3>
              <p className="text-sm text-[#6B7280]">Generating your case document...</p>
            </div>
          ) : (
            <>
              {/* Savings highlight */}
              <div className="text-center mb-6">
                <p className="text-sm text-[#6B7280] mb-1">We found</p>
                <p className="text-3xl font-bold text-[#5A9A6B]">
                  {formatUSD(savingsAmount)}
                </p>
                <p className="text-sm text-[#6B7280]">in potential savings</p>
              </div>

              {/* Fee breakdown */}
              <div className="bg-[#F9FAFB] rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-[#6B7280]">Savings identified</span>
                  <span className="text-sm font-medium text-[#17270C] tabular-nums">
                    {formatUSD(savingsAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-[#6B7280]">Service fee (10%, max $500)</span>
                  <span className="text-sm font-medium text-[#17270C] tabular-nums">
                    {formatUSD(feeAmount)}
                  </span>
                </div>
                <div className="border-t border-[#E5E7EB] pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-[#17270C]">You pay</span>
                    <span className="text-lg font-bold text-[#002125] tabular-nums">
                      {formatUSD(feeAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="mb-4 p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl">
                  <p className="text-sm text-[#DC2626] text-center">{error}</p>
                </div>
              )}

              {/* Action button */}
              <button
                onClick={status === "error" ? handleRetry : handlePayment}
                disabled={status === "processing"}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-medium transition-all",
                  "bg-[#0052FF] text-white hover:bg-[#0040CC]",
                  "disabled:opacity-60 disabled:cursor-not-allowed"
                )}
              >
                {status === "processing" ? (
                  <>
                    <div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : status === "error" ? (
                  <>
                    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Try Again</span>
                  </>
                ) : (
                  <>
                    <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
                    </svg>
                    <span>Pay {formatUSD(feeAmount)} with USDC</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <div className="flex items-center justify-center gap-2 text-xs text-[#6B7280]">
            <svg className="size-4" viewBox="0 0 1024 1024" fill="currentColor">
              <path d="M512 0C229.2 0 0 229.2 0 512s229.2 512 512 512 512-229.2 512-512S794.8 0 512 0zm0 928C282.3 928 96 741.7 96 512S282.3 96 512 96s416 186.3 416 416-186.3 416-416 416z" />
            </svg>
            <span>Powered by Coinbase · Base Network</span>
          </div>
        </div>
      </div>
    </div>
  );
}
