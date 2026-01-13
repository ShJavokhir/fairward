"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Map, { Marker, Popup, NavigationControl } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import Supercluster from "supercluster";
import "mapbox-gl/dist/mapbox-gl.css";
import { cn } from "@/lib/utils";

interface Provider {
  name: string;
  address: string;
  totalCost: number;
}

interface GeocodedProvider extends Provider {
  lng: number;
  lat: number;
}

interface ProvidersMapProps {
  providers: Provider[];
  mapboxToken: string;
  onProviderClick?: (index: number) => void;
  onRequestQuote?: (provider: Provider) => void;
  selectedIndex?: number | null;
}

type ProviderPoint = GeoJSON.Feature<GeoJSON.Point, GeocodedProvider>;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function cleanAddress(address: string): string {
  return address
    .replace(/^"|"$/g, "")
    .replace(/", ,/g, ",")
    .replace(/,\s+\d{5}$/, "")
    .trim();
}

export default function ProvidersMap({
  providers,
  mapboxToken,
  onProviderClick,
  onRequestQuote,
  selectedIndex,
}: ProvidersMapProps) {
  const [geocodedProviders, setGeocodedProviders] = useState<GeocodedProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [popupInfo, setPopupInfo] = useState<GeocodedProvider | null>(null);
  const [zoom, setZoom] = useState(10);
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(null);
  const mapRef = useRef<MapRef>(null);

  // Geocode addresses on mount
  useEffect(() => {
    async function geocodeAddresses() {
      if (providers.length === 0) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            addresses: providers.map((p) => ({
              address: p.address,
              name: p.name,
            })),
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to geocode addresses");
        }

        const data = await response.json();

        // Match geocoded locations back to providers
        const geocoded: GeocodedProvider[] = [];
        for (const loc of data.locations) {
          const provider = providers.find(
            (p) => p.address === loc.address || p.name === loc.name
          );
          if (provider) {
            geocoded.push({
              ...provider,
              lng: loc.lng,
              lat: loc.lat,
            });
          }
        }

        setGeocodedProviders(geocoded);
      } catch (err) {
        console.error("Geocoding error:", err);
        setError(err instanceof Error ? err.message : "Failed to load map");
      } finally {
        setIsLoading(false);
      }
    }

    geocodeAddresses();
  }, [providers]);

  // Calculate initial map bounds from data
  const dataBounds = useMemo(() => {
    if (geocodedProviders.length === 0) return null;

    const lngs = geocodedProviders.map((p) => p.lng);
    const lats = geocodedProviders.map((p) => p.lat);

    return {
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
    };
  }, [geocodedProviders]);

  // Calculate center and zoom
  const initialViewState = useMemo(() => {
    if (!dataBounds) {
      return {
        longitude: -118.2437, // Default to LA
        latitude: 34.0522,
        zoom: 10,
      };
    }

    const centerLng = (dataBounds.minLng + dataBounds.maxLng) / 2;
    const centerLat = (dataBounds.minLat + dataBounds.maxLat) / 2;

    // Calculate zoom based on bounds spread
    const lngSpread = dataBounds.maxLng - dataBounds.minLng;
    const latSpread = dataBounds.maxLat - dataBounds.minLat;
    const maxSpread = Math.max(lngSpread, latSpread);

    let zoom = 11;
    if (maxSpread > 1) zoom = 8;
    else if (maxSpread > 0.5) zoom = 9;
    else if (maxSpread > 0.2) zoom = 10;
    else if (maxSpread > 0.1) zoom = 11;
    else zoom = 12;

    return {
      longitude: centerLng,
      latitude: centerLat,
      zoom,
    };
  }, [dataBounds]);

  // Price range for color scale
  const priceRange = useMemo(() => {
    if (geocodedProviders.length === 0) return { min: 0, max: 1 };
    const prices = geocodedProviders.map((p) => p.totalCost);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }, [geocodedProviders]);

  // Get marker color based on price (sage-aligned semantic palette)
  const getMarkerColor = useCallback(
    (cost: number) => {
      if (priceRange.max === priceRange.min) return "#5A9A6B"; // sage green if all same price

      const ratio = (cost - priceRange.min) / (priceRange.max - priceRange.min);

      // Sage palette: Green → Gold → Rose
      if (ratio < 0.33) return "#5A9A6B"; // sage green (low)
      if (ratio < 0.66) return "#C4A86B"; // muted gold (mid)
      return "#C47B8C"; // dusty rose (high)
    },
    [priceRange]
  );

  // Create supercluster index
  const superclusterIndex = useMemo(() => {
    const index = new Supercluster<GeocodedProvider>({
      radius: 60,
      maxZoom: 14,
    });

    const points: ProviderPoint[] = geocodedProviders.map((provider) => ({
      type: "Feature",
      properties: provider,
      geometry: {
        type: "Point",
        coordinates: [provider.lng, provider.lat],
      },
    }));

    index.load(points);
    return index;
  }, [geocodedProviders]);

  // Get clusters for current viewport
  const clusters = useMemo(() => {
    if (!bounds || geocodedProviders.length === 0) return [];
    return superclusterIndex.getClusters(bounds, Math.floor(zoom));
  }, [superclusterIndex, bounds, zoom, geocodedProviders]);

  // Handle map move
  const onMapMove = useCallback(() => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();
    const mapBounds = map.getBounds();
    if (!mapBounds) return;
    setBounds([
      mapBounds.getWest(),
      mapBounds.getSouth(),
      mapBounds.getEast(),
      mapBounds.getNorth(),
    ]);
    setZoom(map.getZoom());
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-full min-h-80 bg-[#F2FBEF] rounded-2xl flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-6 border-2 border-[#002125] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#5F7A7A]">Loading map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full min-h-80 bg-[#F2FBEF] rounded-2xl flex items-center justify-center">
        <p className="text-sm text-[#5F7A7A]">{error}</p>
      </div>
    );
  }

  if (geocodedProviders.length === 0) {
    return (
      <div className="w-full h-full min-h-80 bg-[#F2FBEF] rounded-2xl flex items-center justify-center">
        <p className="text-sm text-[#5F7A7A]">No locations to display</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-80 rounded-2xl overflow-hidden border border-[#002125]/10">
      <Map
        ref={mapRef}
        mapboxAccessToken={mapboxToken}
        initialViewState={initialViewState}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        attributionControl={false}
        onMove={onMapMove}
        onLoad={onMapMove}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {clusters.map((cluster) => {
          const [lng, lat] = cluster.geometry.coordinates;
          const isCluster = "cluster" in cluster.properties && cluster.properties.cluster;

          if (isCluster) {
            const pointCount = (cluster.properties as { point_count: number }).point_count;
            const size = Math.min(60, 30 + (pointCount / geocodedProviders.length) * 30);

            return (
              <Marker
                key={`cluster-${cluster.id}`}
                longitude={lng}
                latitude={lat}
                anchor="center"
                onClick={() => {
                  const expansionZoom = Math.min(
                    superclusterIndex.getClusterExpansionZoom(cluster.id as number),
                    20
                  );
                  mapRef.current?.flyTo({
                    center: [lng, lat],
                    zoom: expansionZoom,
                    duration: 500,
                  });
                }}
              >
                <div
                  className="cursor-pointer flex items-center justify-center rounded-full bg-[#002125] text-[#CEFDCE] font-medium hover:scale-105 transition-transform"
                  style={{ width: size, height: size }}
                >
                  {pointCount}
                </div>
              </Marker>
            );
          }

          // Individual marker
          const provider = cluster.properties as GeocodedProvider;
          const providerIndex = geocodedProviders.findIndex(
            (p) => p.lng === lng && p.lat === lat
          );
          const isSelected = selectedIndex === providerIndex;
          const color = getMarkerColor(provider.totalCost);

          return (
            <Marker
              key={`marker-${provider.name}-${lng}-${lat}`}
              longitude={lng}
              latitude={lat}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setPopupInfo(provider);
                if (providerIndex !== -1) {
                  onProviderClick?.(providerIndex);
                }
              }}
            >
              <div
                className={`cursor-pointer transition-transform ${
                  isSelected ? "scale-125 z-10" : "hover:scale-110"
                }`}
              >
                <svg
                  width="32"
                  height="40"
                  viewBox="0 0 32 40"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24c0-8.837-7.163-16-16-16z"
                    fill={color}
                    stroke="#fff"
                    strokeWidth="2"
                  />
                  <circle cx="16" cy="16" r="6" fill="#fff" />
                </svg>
              </div>
            </Marker>
          );
        })}

        {popupInfo && (
          <Popup
            longitude={popupInfo.lng}
            latitude={popupInfo.lat}
            anchor="bottom"
            offset={[0, -40]}
            onClose={() => setPopupInfo(null)}
            closeButton={true}
            closeOnClick={false}
            className="provider-popup"
          >
            <div className="p-1 min-w-[200px]">
              <h3 className="font-medium text-[#0F2E2E] text-sm leading-tight mb-1">
                {popupInfo.name}
              </h3>
              <p className="text-xs text-[#5F7A7A] mb-2">
                {cleanAddress(popupInfo.address)}
              </p>
              <p className="text-lg font-semibold text-[#0F2E2E] mb-3 tabular-nums">
                {formatCurrency(popupInfo.totalCost)}
              </p>
              {onRequestQuote && (
                <button
                  onClick={() => {
                    onRequestQuote(popupInfo);
                    setPopupInfo(null);
                  }}
                  className="w-full py-2 px-3 bg-[#002125] hover:bg-[#012E33] text-[#CEFDCE] text-xs font-medium rounded-full transition-colors flex items-center justify-center gap-1.5"
                >
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Request Quote
                </button>
              )}
            </div>
          </Popup>
        )}
      </Map>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs flex items-center gap-3 border border-[#002125]/10">
        <div className="flex items-center gap-1.5">
          <div className="size-3 rounded-full bg-[#5A9A6B]" />
          <span className="text-[#5F7A7A]">Low</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-3 rounded-full bg-[#C4A86B]" />
          <span className="text-[#5F7A7A]">Mid</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-3 rounded-full bg-[#C47B8C]" />
          <span className="text-[#5F7A7A]">High</span>
        </div>
      </div>
    </div>
  );
}
