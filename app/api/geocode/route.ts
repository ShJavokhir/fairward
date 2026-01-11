import { NextRequest, NextResponse } from "next/server";

const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

interface GeocodedLocation {
  address: string;
  lng: number;
  lat: number;
  name?: string;
}

interface GeocodeRequest {
  addresses: { address: string; name?: string }[];
}

export async function POST(request: NextRequest) {
  if (!MAPBOX_TOKEN) {
    return NextResponse.json(
      { error: "Mapbox token not configured" },
      { status: 500 }
    );
  }

  try {
    const body: GeocodeRequest = await request.json();
    const { addresses } = body;

    if (!addresses || !Array.isArray(addresses)) {
      return NextResponse.json(
        { error: "addresses array required" },
        { status: 400 }
      );
    }

    // Geocode addresses in parallel (with limit to avoid rate limits)
    const results: GeocodedLocation[] = [];
    const batchSize = 10;

    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async ({ address, name }): Promise<GeocodedLocation | null> => {
          try {
            // Clean address for geocoding
            const cleanedAddress = address
              .replace(/^"|"$/g, "")
              .replace(/", ,/g, ",")
              .trim();

            const encodedAddress = encodeURIComponent(cleanedAddress);
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${MAPBOX_TOKEN}&limit=1&country=US`;

            const response = await fetch(url);

            if (!response.ok) {
              console.error(`Geocoding failed for: ${address}`);
              return null;
            }

            const data = await response.json();

            if (data.features && data.features.length > 0) {
              const [lng, lat] = data.features[0].center;
              const result: GeocodedLocation = {
                address,
                lng,
                lat,
              };
              if (name) result.name = name;
              return result;
            }

            return null;
          } catch (err) {
            console.error(`Error geocoding ${address}:`, err);
            return null;
          }
        })
      );

      for (const r of batchResults) {
        if (r !== null) results.push(r);
      }
    }

    return NextResponse.json({
      success: true,
      locations: results,
      total: addresses.length,
      geocoded: results.length,
    });
  } catch (error) {
    console.error("Geocoding error:", error);
    return NextResponse.json(
      { error: "Failed to geocode addresses" },
      { status: 500 }
    );
  }
}
