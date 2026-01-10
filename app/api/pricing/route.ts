import { NextRequest, NextResponse } from "next/server";

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
    // The external API expects POST with JSON body
    const response = await fetch("https://simple-backend-ret2i2nfuq-uc.a.run.app/get_results", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        procedure_id: procedureId,
        metro_slug: metroSlug,
        price_type: priceType,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("External API error:", response.status, errorText);
      return NextResponse.json(
        { error: "Failed to fetch pricing data" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching pricing:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
