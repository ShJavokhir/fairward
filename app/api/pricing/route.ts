import { NextRequest, NextResponse } from "next/server";
import { getPricingWithCache } from "@/lib/pricing-cache";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const procedureId = searchParams.get("procedure_id");
  const metroSlug = searchParams.get("metro_slug");
  const priceType = searchParams.get("price_type") || "public";

  if (!procedureId || !metroSlug) {
    return NextResponse.json(
      { error: "Missing required parameters: procedure_id and metro_slug" },
      { status: 400 }
    );
  }

  try {
    // Use cache-aside pattern: check cache first, fetch if miss
    const result = await getPricingWithCache(procedureId, metroSlug, priceType);

    // Add cache headers for debugging/monitoring
    const headers = new Headers();
    headers.set("X-Cache", result.fromCache ? "HIT" : "MISS");
    if (result.cacheAge !== undefined) {
      headers.set("X-Cache-Age", String(Math.round(result.cacheAge / 1000))); // seconds
    }

    return NextResponse.json(result.data, { headers });
  } catch (error) {
    console.error("Error fetching pricing:", error);

    // Determine appropriate status code
    const isExternalError =
      error instanceof Error && error.message.includes("External API");
    const statusCode = isExternalError ? 502 : 500;

    return NextResponse.json(
      {
        error: isExternalError
          ? "Failed to fetch pricing data from external source"
          : "Internal server error",
      },
      { status: statusCode }
    );
  }
}
