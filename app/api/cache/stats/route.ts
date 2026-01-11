import { NextResponse } from "next/server";
import { getCacheStats } from "@/lib/pricing-cache";

export async function GET() {
  try {
    const stats = await getCacheStats();

    return NextResponse.json({
      success: true,
      stats: {
        ...stats,
        avgFetchDurationMs: stats.avgFetchDuration,
        oldestEntry: stats.oldestEntry?.toISOString() || null,
        newestEntry: stats.newestEntry?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error("Error getting cache stats:", error);
    return NextResponse.json(
      { error: "Failed to get cache statistics" },
      { status: 500 }
    );
  }
}
