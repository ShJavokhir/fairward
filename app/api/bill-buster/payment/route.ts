import { NextResponse } from "next/server";
import type { PaymentReceipt } from "@/lib/types/payment";

/**
 * Mock payment API for Bill Buster
 *
 * In production, this would:
 * 1. Verify x402 payment header
 * 2. Confirm USDC transfer on Base network
 * 3. Store receipt in MongoDB
 *
 * For MVP, simulates successful payment
 */
export async function POST(req: Request) {
  try {
    const { analysisId, feeAmount, savingsAmount, walletAddress } = await req.json();

    // Validate required fields
    if (!analysisId || feeAmount === undefined) {
      return NextResponse.json(
        { error: "Missing required fields", success: false },
        { status: 400 }
      );
    }

    // Simulate payment processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock: 95% success rate for demo purposes
    const shouldSucceed = Math.random() > 0.05;

    if (!shouldSucceed) {
      return NextResponse.json(
        { error: "Payment declined. Please try again.", success: false },
        { status: 402 }
      );
    }

    // Generate mock transaction hash
    const transactionHash = "0x" + Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("");

    const receipt: PaymentReceipt = {
      id: crypto.randomUUID(),
      amount: feeAmount,
      currency: "USDC",
      network: "base",
      timestamp: new Date().toISOString(),
      transactionHash,
    };

    // In production: Store payment record in MongoDB
    // await db.collection('payments').insertOne({
    //   analysisId,
    //   receipt,
    //   savingsAmount,
    //   walletAddress,
    //   createdAt: new Date(),
    // });

    return NextResponse.json({
      success: true,
      receipt,
      message: "Payment successful",
    });
  } catch (error) {
    console.error("Payment error:", error);
    return NextResponse.json(
      { error: "Payment processing failed", success: false },
      { status: 500 }
    );
  }
}
