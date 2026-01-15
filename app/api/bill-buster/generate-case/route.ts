import { NextRequest, NextResponse } from "next/server";
import { generateCaseDocument } from "@/lib/bill-analysis";
import type { BillAnalysis, GenerateCaseResponse } from "@/lib/types/bill-analysis";

export async function POST(req: NextRequest) {
  try {
    const { analysis, patientName } = (await req.json()) as {
      analysis: BillAnalysis;
      patientName?: string;
    };

    if (!analysis) {
      return NextResponse.json(
        { error: "No analysis provided", success: false },
        { status: 400 }
      );
    }

    const document = generateCaseDocument(analysis, patientName);

    const response: GenerateCaseResponse = {
      success: true,
      document,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Generate case error:", error);
    return NextResponse.json(
      { error: "Failed to generate case document", success: false },
      { status: 500 }
    );
  }
}
