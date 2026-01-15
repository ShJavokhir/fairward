/**
 * Payment types for Bill Buster x402 integration
 */

export interface PaymentIntent {
  id: string;
  analysisId: string;
  savingsAmount: number;
  feeAmount: number;
  status: "pending" | "processing" | "completed" | "failed";
  walletAddress?: string;
  transactionHash?: string;
  createdAt: Date;
}

export interface PaymentReceipt {
  id: string;
  amount: number;
  currency: "USDC";
  network: "base" | "ethereum";
  timestamp: string;
  transactionHash: string;
}

export type PaymentStatus = "idle" | "connecting" | "processing" | "success" | "error";

/**
 * Calculate the service fee based on savings
 * Fee = 10% of savings, capped at $500
 */
export function calculateFee(savings: number): number {
  const fee = savings * 0.1;
  return Math.min(fee, 500);
}

/**
 * Format currency for display
 */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
