"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import OutreachModal from "@/components/OutreachModal";
import { ChatPanel } from "@/components/ChatPanel";
import dynamic from "next/dynamic";

const ProvidersMap = dynamic(() => import("@/components/ProvidersMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-80 bg-[#F2FAF7] rounded-2xl flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-[#0A4D4D] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[#5F7A7A]">Loading map...</p>
      </div>
    </div>
  ),
});

// ============================================================================
// TypeScript Interfaces
// ============================================================================

interface NetworkPrice {
  network: string;
  min: number;
  max: number;
  mean: number;
  median: number;
  count: number;
}

interface BreakdownItem {
  cost: number;
  cash_pay: number | null;
  cluster_id: string;
  main_step_number: number;
  step_number: number;
  sub_step_number: number;
  price_type: string;
  payer: string | null;
  network_prices: NetworkPrice[];
}

interface Coverage {
  score: number;
  matched_items: number;
  total_items: number;
}

interface ProviderResult {
  name: string;
  address: string;
  totalCost: number;
  distance_miles: number;
  coverage: Coverage;
  breakdown: BreakdownItem[];
}

interface MainStep {
  step_number: number;
  description: string;
  probability: number;
}

interface SubStep {
  step_number: number;
  parent_step: number;
  service_description: string;
  category: string;
  cluster_id: string;
  tags: string[];
  key_words: string[];
  minimum_reasonable_price: number;
  maximum_reasonable_price: number;
  probability: number;
  representative_id: string;
}

interface EnrichedBundle {
  main_steps: MainStep[];
  sub_steps: SubStep[];
  location_info: Record<string, unknown>;
  query: string;
}

interface Bundle {
  enriched_bundle: EnrichedBundle;
  bundle_with_clusters?: {
    query_stats?: {
      bytes_processed: number;
      processing_time_seconds: number;
      search_time_seconds: number;
    };
  };
}

interface Results {
  bundle: Bundle;
  results: ProviderResult[];
}

interface ApiResponseData {
  metro: string;
  price_type: string;
  procedure: string;
  results: Results;
  source: string;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data: ApiResponseData;
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatProcedureName(name: string): string {
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function cleanAddress(address: string): string {
  return address
    .replace(/^"|"$/g, "")
    .replace(/", ,/g, ",")
    .replace(/,\s+\d{5}$/, "")
    .trim();
}

function getPriceTypeBadge(priceType: string): { label: string; isVerified: boolean } {
  switch (priceType?.toUpperCase()) {
    case "MRF":
      return { label: "Verified", isVerified: true };
    case "ESTIMATED_FALLBACK":
      return { label: "Estimated", isVerified: false };
    default:
      return { label: priceType || "Unknown", isVerified: false };
  }
}

// ============================================================================
// Sort Options
// ============================================================================

type SortOption = "price_low" | "price_high" | "coverage" | "name";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
  { value: "coverage", label: "Best Coverage" },
  { value: "name", label: "Name A-Z" },
];

// ============================================================================
// Main Component
// ============================================================================

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const procedureId = searchParams.get("procedure_id") || "";
  const metroSlug = searchParams.get("metro_slug") || "";

  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedProvider, setExpandedProvider] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("price_low");
  const [showSteps, setShowSteps] = useState(false);
  const [outreachProvider, setOutreachProvider] = useState<ProviderResult | null>(null);
  const [showShareToast, setShowShareToast] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2000);
    }
  };

  // Filters
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  useEffect(() => {
    async function fetchPricing() {
      if (!procedureId || !metroSlug) {
        setError("Missing procedure or location information");
        setIsLoading(false);
        return;
      }

      try {
        const url = `/api/pricing?procedure_id=${encodeURIComponent(procedureId)}&metro_slug=${encodeURIComponent(metroSlug)}&price_type=public`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("Failed to fetch pricing data");
        }

        const data: ApiResponse = await response.json();

        if (!data.success) {
          throw new Error(data.message || "Failed to fetch pricing data");
        }

        setApiResponse(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load pricing");
      } finally {
        setIsLoading(false);
      }
    }

    fetchPricing();
  }, [procedureId, metroSlug]);

  const toggleProvider = (index: number) => {
    setExpandedProvider(expandedProvider === index ? null : index);
  };

  const procedureName = apiResponse?.data?.procedure || procedureId;
  const mainSteps = apiResponse?.data?.results?.bundle?.enriched_bundle?.main_steps || [];
  const subSteps = apiResponse?.data?.results?.bundle?.enriched_bundle?.sub_steps || [];
  const providers = apiResponse?.data?.results?.results || [];

  const clusterToSubStep = useMemo(() => {
    const map = new Map<string, SubStep>();
    subSteps.forEach(step => {
      map.set(step.cluster_id, step);
    });
    return map;
  }, [subSteps]);

  const stepToDescription = useMemo(() => {
    const map = new Map<number, string>();
    mainSteps.forEach(step => {
      map.set(step.step_number, step.description);
    });
    return map;
  }, [mainSteps]);

  const filteredAndSortedProviders = useMemo(() => {
    // Apply filters
    let filtered = [...providers];

    if (maxPrice !== null) {
      filtered = filtered.filter(p => p.totalCost <= maxPrice);
    }

    if (verifiedOnly) {
      filtered = filtered.filter(p => {
        const mrfCount = p.breakdown.filter(b => b.price_type === "MRF").length;
        return mrfCount > 0;
      });
    }

    // Sort
    switch (sortBy) {
      case "price_low":
        filtered.sort((a, b) => a.totalCost - b.totalCost);
        break;
      case "price_high":
        filtered.sort((a, b) => b.totalCost - a.totalCost);
        break;
      case "coverage":
        filtered.sort((a, b) => b.coverage.score - a.coverage.score);
        break;
      case "name":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    return filtered;
  }, [providers, sortBy, maxPrice, verifiedOnly]);

  // Keep sortedProviders as alias for backward compatibility
  const sortedProviders = filteredAndSortedProviders;

  const priceRange = providers.length > 0 ? {
    min: Math.min(...providers.map(p => p.totalCost)),
    max: Math.max(...providers.map(p => p.totalCost)),
    avg: providers.reduce((sum, p) => sum + p.totalCost, 0) / providers.length
  } : null;

  const chatContext = useMemo(() => {
    if (!apiResponse) return "";

    const data = apiResponse.data;
    const providerSummaries = providers.map((p, i) => {
      const breakdown = p.breakdown.map(b => {
        const subStep = clusterToSubStep.get(b.cluster_id);
        return `  - ${subStep?.service_description || b.cluster_id}: $${b.cost} (${b.price_type})`;
      }).join("\n");

      return `${i + 1}. ${p.name}
   Address: ${cleanAddress(p.address)}
   Total Cost: $${p.totalCost}
   Coverage: ${p.coverage.score}% (${p.coverage.matched_items}/${p.coverage.total_items} items)
   Cost Breakdown:
${breakdown}`;
    }).join("\n\n");

    const stepsInfo = mainSteps.map(s => `${s.step_number}. ${s.description}`).join("\n");

    return `PROCEDURE: ${formatProcedureName(data.procedure)}
LOCATION: ${formatProcedureName(data.metro.replace(/_/g, " "))}
PRICE TYPE: ${data.price_type}

PROCEDURE STEPS:
${stepsInfo}

PRICE RANGE:
- Lowest: $${priceRange?.min || 0}
- Average: $${Math.round(priceRange?.avg || 0)}
- Highest: $${priceRange?.max || 0}
- Potential Savings: $${(priceRange?.max || 0) - (priceRange?.min || 0)}

PROVIDERS (${providers.length} total):

${providerSummaries}`;
  }, [apiResponse, providers, mainSteps, priceRange, clusterToSubStep]);

  const getGroupedBreakdown = (breakdown: BreakdownItem[]) => {
    const grouped = new Map<number, BreakdownItem[]>();
    breakdown.forEach(item => {
      const existing = grouped.get(item.main_step_number) || [];
      existing.push(item);
      grouped.set(item.main_step_number, existing);
    });
    return grouped;
  };

  return (
    <div className="min-h-screen bg-[#FDFCFA]">
      {/* Navigation */}
      <nav className="border-b border-[#0F2E2E]/5 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="group">
            <img
              src="/justprice-logo.jpeg"
              alt="JustPrice"
              className="h-9 w-auto group-hover:opacity-80 transition-opacity"
            />
          </Link>

          <div className="flex items-center gap-4">
            <button
              onClick={handleShare}
              className="flex items-center gap-2 text-sm text-[#5F7A7A] hover:text-[#0A4D4D] transition-colors font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span>Share</span>
            </button>
            <button
              onClick={() => router.push("/query")}
              className="flex items-center gap-2 text-sm text-[#5F7A7A] hover:text-[#0A4D4D] transition-colors font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>New Search</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 md:py-12">
        {/* Loading State - Skeleton */}
        {isLoading && (
          <div className="animate-pulse">
            {/* Header Skeleton */}
            <div className="mb-8">
              <div className="h-6 w-32 bg-[#E8F5F0] rounded-full mb-4" />
              <div className="h-10 w-80 bg-[#E8F5F0] rounded-lg mb-2" />
              <div className="h-5 w-48 bg-[#F5F5F3] rounded-lg" />
            </div>

            {/* Price Range Skeleton */}
            <div className="mb-8 p-6 bg-white rounded-2xl border border-[#0F2E2E]/5">
              <div className="grid grid-cols-3 gap-6 mb-6">
                <div>
                  <div className="h-3 w-12 bg-[#F5F5F3] rounded mb-2" />
                  <div className="h-9 w-24 bg-[#E8F5F0] rounded-lg" />
                </div>
                <div className="text-center">
                  <div className="h-3 w-12 bg-[#F5F5F3] rounded mb-2 mx-auto" />
                  <div className="h-9 w-24 bg-[#F5F5F3] rounded-lg mx-auto" />
                </div>
                <div className="text-right">
                  <div className="h-3 w-12 bg-[#F5F5F3] rounded mb-2 ml-auto" />
                  <div className="h-9 w-24 bg-[#F5F5F3] rounded-lg ml-auto" />
                </div>
              </div>
              <div className="pt-4 border-t border-[#0F2E2E]/5 flex items-center justify-between">
                <div className="h-4 w-28 bg-[#F5F5F3] rounded" />
                <div className="h-6 w-20 bg-[#E8F5F0] rounded-lg" />
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Provider Cards Skeleton */}
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white rounded-2xl border border-[#0F2E2E]/5 p-5 md:p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#F2FAF7] rounded-xl" />
                      <div className="flex-1">
                        <div className="h-5 w-48 bg-[#F5F5F3] rounded mb-2" />
                        <div className="h-4 w-64 bg-[#F5F5F3]/50 rounded mb-2" />
                        <div className="flex gap-3">
                          <div className="h-3 w-20 bg-[#F5F5F3]/50 rounded" />
                          <div className="h-3 w-16 bg-[#F5F5F3]/50 rounded" />
                        </div>
                      </div>
                      <div className="h-8 w-24 bg-[#F5F5F3] rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Column: Map Skeleton */}
              <div className="hidden lg:block">
                <div className="sticky top-24 h-[calc(100vh-8rem)] bg-[#F2FAF7] rounded-2xl border border-[#0F2E2E]/5 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-6 h-6 border-2 border-[#0A4D4D] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-[#5F7A7A]">Loading map...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="py-24 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="font-display text-2xl text-[#0F2E2E] mb-2">Unable to Load Pricing</h2>
            <p className="text-[#5F7A7A] mb-6">{error}</p>
            <button
              onClick={() => router.push("/query")}
              className="px-6 py-3 bg-[#0A4D4D] text-white rounded-xl font-medium hover:bg-[#0D5F5F] transition-colors"
            >
              Try Another Search
            </button>
          </div>
        )}

        {/* Results */}
        {!isLoading && !error && apiResponse && (
          <>
            {/* Header */}
            <div className="mb-8">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#CCFBF1] text-[#0A4D4D] text-xs font-medium rounded-full mb-4">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Price Comparison
              </span>
              <h1 className="font-display text-3xl md:text-4xl font-normal leading-[1.1] tracking-tight text-[#0F2E2E] mb-2">
                {formatProcedureName(procedureName)}
              </h1>
              <p className="text-[#5F7A7A]">
                {providers.length} providers in {formatProcedureName(apiResponse.data.metro.replace(/_/g, " "))}
              </p>
            </div>

            {/* Price Range Summary */}
            {priceRange && (
              <div className="mb-8 p-6 bg-white rounded-2xl border border-[#0F2E2E]/5 shadow-sm">
                <div className="grid grid-cols-3 gap-6 mb-6">
                  <div>
                    <p className="text-xs text-[#5F7A7A] mb-1">Lowest</p>
                    <p className="font-display text-2xl md:text-3xl text-[#22C55E] tabular-nums">{formatCurrency(priceRange.min)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-[#5F7A7A] mb-1">Average</p>
                    <p className="font-display text-2xl md:text-3xl text-[#0F2E2E] tabular-nums">{formatCurrency(priceRange.avg)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#5F7A7A] mb-1">Highest</p>
                    <p className="font-display text-2xl md:text-3xl text-[#0F2E2E]/40 tabular-nums">{formatCurrency(priceRange.max)}</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-[#0F2E2E]/5 flex items-center justify-between">
                  <span className="text-sm text-[#5F7A7A]">Potential savings</span>
                  <span className="font-display text-xl text-[#22C55E] tabular-nums">
                    {formatCurrency(priceRange.max - priceRange.min)}
                  </span>
                </div>
              </div>
            )}

            {/* Two Column Layout: Providers Left, Map Right */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Provider List */}
              <div>
                {/* Procedure Steps Toggle */}
                {mainSteps.length > 0 && (
                  <div className="mb-6">
                    <button
                      onClick={() => setShowSteps(!showSteps)}
                      className="flex items-center gap-2 text-sm text-[#5F7A7A] hover:text-[#0A4D4D] transition-colors font-medium"
                    >
                      <svg
                        className={`w-4 h-4 transition-transform ${showSteps ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      {showSteps ? "Hide" : "Show"} procedure steps ({mainSteps.length})
                    </button>

                    {showSteps && (
                      <div className="mt-4 space-y-2">
                        {mainSteps.map((step) => (
                          <div
                            key={step.step_number}
                            className="flex items-start gap-3 p-4 bg-white rounded-xl border border-[#0F2E2E]/5"
                          >
                            <div className="w-7 h-7 bg-[#E8F5F0] rounded-lg flex items-center justify-center text-sm font-medium text-[#0A4D4D] flex-shrink-0">
                              {step.step_number}
                            </div>
                            <div className="flex-1">
                              <p className="text-[#0F2E2E]">{step.description}</p>
                              {step.probability < 1 && (
                                <p className="text-xs text-[#5F7A7A] mt-1">
                                  {Math.round(step.probability * 100)}% likelihood
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Filters & Sort Controls */}
                <div className="mb-4 p-4 bg-white rounded-xl border border-[#0F2E2E]/5">
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Max Price Filter */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-[#5F7A7A]">Max price:</label>
                      <select
                        value={maxPrice ?? ""}
                        onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : null)}
                        className="px-3 py-1.5 bg-[#F8FAFA] border border-[#0F2E2E]/10 rounded-lg text-sm text-[#0F2E2E] focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/30"
                      >
                        <option value="">Any</option>
                        <option value="1000">Under $1,000</option>
                        <option value="2500">Under $2,500</option>
                        <option value="5000">Under $5,000</option>
                        <option value="10000">Under $10,000</option>
                        <option value="25000">Under $25,000</option>
                      </select>
                    </div>

                    {/* Verified Only Filter */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={verifiedOnly}
                        onChange={(e) => setVerifiedOnly(e.target.checked)}
                        className="w-4 h-4 rounded border-[#0F2E2E]/20 text-[#2DD4BF] focus:ring-[#2DD4BF]/30"
                      />
                      <span className="text-sm text-[#5F7A7A]">Verified prices only</span>
                    </label>

                    <div className="flex-1" />

                    {/* Sort */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-[#5F7A7A]">Sort:</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="px-3 py-1.5 bg-[#F8FAFA] border border-[#0F2E2E]/10 rounded-lg text-sm text-[#0F2E2E] focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/30"
                      >
                        {sortOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Filter Summary */}
                  {(maxPrice !== null || verifiedOnly) && (
                    <div className="mt-3 pt-3 border-t border-[#0F2E2E]/5 flex items-center justify-between">
                      <p className="text-xs text-[#5F7A7A]">
                        Showing {sortedProviders.length} of {providers.length} providers
                      </p>
                      <button
                        onClick={() => {
                          setMaxPrice(null);
                          setVerifiedOnly(false);
                        }}
                        className="text-xs text-[#2DD4BF] hover:text-[#0A4D4D] transition-colors"
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                </div>

                {/* Provider Results */}
                <div className="space-y-3">
                  {providers.length === 0 && (
                    <div className="py-12 text-center bg-white rounded-2xl border border-[#0F2E2E]/5">
                      <p className="text-[#5F7A7A]">No provider pricing data available.</p>
                    </div>
                  )}

                  {sortedProviders.map((provider, index) => {
                    const groupedBreakdown = getGroupedBreakdown(provider.breakdown);
                    const isExpanded = expandedProvider === index;
                    const mrfCount = provider.breakdown.filter(b => b.price_type === "MRF").length;
                    const totalItems = provider.breakdown.length;
                    const isLowestPrice = provider.totalCost === priceRange?.min;

                    return (
                      <div
                        key={index}
                        className={`bg-white rounded-2xl border overflow-hidden transition-all ${
                          isLowestPrice ? "border-[#22C55E]/30 ring-1 ring-[#22C55E]/10" : "border-[#0F2E2E]/5 hover:border-[#0F2E2E]/10"
                        }`}
                      >
                        {/* Lowest Price Badge */}
                        {isLowestPrice && (
                          <div className="px-5 py-2 bg-[#DCFCE7] border-b border-[#22C55E]/10">
                            <span className="text-xs font-medium text-[#166534] flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Lowest Price
                            </span>
                          </div>
                        )}

                        {/* Provider Header */}
                        <button
                          onClick={() => toggleProvider(index)}
                          className="w-full p-5 md:p-6 text-left flex items-center justify-between hover:bg-[#F2FAF7]/50 transition-colors"
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-12 h-12 bg-[#F2FAF7] rounded-xl flex items-center justify-center text-[#0A4D4D] flex-shrink-0">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-[#0F2E2E] truncate">{provider.name}</h3>
                              <p className="text-sm text-[#5F7A7A] truncate">{cleanAddress(provider.address)}</p>
                              <div className="flex items-center gap-3 mt-2">
                                <span className="text-xs text-[#5F7A7A]">
                                  {provider.coverage.score}% coverage
                                </span>
                                <span className="text-[#94A3A3]">·</span>
                                <span className={`text-xs ${mrfCount === totalItems ? "text-[#22C55E]" : "text-[#5F7A7A]"}`}>
                                  {mrfCount}/{totalItems} verified
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 ml-4">
                            <div className="text-right">
                              <p className={`font-display text-2xl tabular-nums ${isLowestPrice ? "text-[#22C55E]" : "text-[#0F2E2E]"}`}>
                                {formatCurrency(provider.totalCost)}
                              </p>
                            </div>
                            <svg
                              className={`w-5 h-5 text-[#5F7A7A] transition-transform ${isExpanded ? "rotate-180" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="border-t border-[#0F2E2E]/5 p-5 md:p-6 bg-[#F2FAF7]">
                            {/* Coverage Bar */}
                            <div className="mb-6 p-4 bg-white rounded-xl border border-[#0F2E2E]/5">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-[#5F7A7A]">Data Coverage</span>
                                <span className="font-display text-lg text-[#0F2E2E]">{provider.coverage.score}%</span>
                              </div>
                              <div className="w-full bg-[#E8F5F0] rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-[#2DD4BF] to-[#22C55E] h-2 rounded-full transition-all"
                                  style={{ width: `${provider.coverage.score}%` }}
                                />
                              </div>
                              <p className="text-xs text-[#5F7A7A] mt-2">
                                {provider.coverage.matched_items} of {provider.coverage.total_items} cost items matched
                              </p>
                            </div>

                            {/* Cost Breakdown */}
                            <h4 className="text-xs tracking-[0.15em] uppercase text-[#5F7A7A] mb-4">Cost Breakdown</h4>
                            <div className="space-y-3">
                              {Array.from(groupedBreakdown.entries())
                                .sort(([a], [b]) => a - b)
                                .map(([stepNum, items]) => {
                                  const stepDescription = stepToDescription.get(stepNum) || `Step ${stepNum}`;
                                  const stepTotal = items.reduce((sum, item) => sum + item.cost, 0);

                                  return (
                                    <div key={stepNum} className="bg-white rounded-xl border border-[#0F2E2E]/5 overflow-hidden">
                                      <div className="px-4 py-3 border-b border-[#0F2E2E]/5 flex items-center justify-between bg-[#F2FAF7]">
                                        <div className="flex items-center gap-2">
                                          <span className="w-6 h-6 bg-[#E8F5F0] rounded-md flex items-center justify-center text-xs font-medium text-[#0A4D4D]">
                                            {stepNum}
                                          </span>
                                          <span className="text-sm font-medium text-[#0F2E2E]">{stepDescription}</span>
                                        </div>
                                        <span className="font-display text-[#0F2E2E] tabular-nums">{formatCurrency(stepTotal)}</span>
                                      </div>

                                      <div className="divide-y divide-[#0F2E2E]/5">
                                        {items.map((item, itemIndex) => {
                                          const subStep = clusterToSubStep.get(item.cluster_id);
                                          const badge = getPriceTypeBadge(item.price_type);

                                          return (
                                            <div key={itemIndex} className="px-4 py-3 flex items-start justify-between gap-3">
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                  {subStep && (
                                                    <span className="text-xs text-[#5F7A7A] capitalize">
                                                      {subStep.category.replace(/_/g, " ")}
                                                    </span>
                                                  )}
                                                  <span className={`text-xs px-2 py-0.5 rounded-full ${badge.isVerified ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#F2FAF7] text-[#5F7A7A]"}`}>
                                                    {badge.label}
                                                  </span>
                                                </div>
                                                <p className="text-sm text-[#0F2E2E]/70 truncate">
                                                  {subStep?.service_description || item.cluster_id}
                                                </p>
                                                {item.cash_pay && item.cash_pay !== item.cost && (
                                                  <p className="text-xs text-[#5F7A7A] mt-1">
                                                    Cash: {formatCurrency(item.cash_pay)}
                                                  </p>
                                                )}
                                              </div>
                                              <div className="text-right flex-shrink-0">
                                                <p className="font-medium text-[#0F2E2E] tabular-nums">{formatCurrency(item.cost)}</p>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>

                            {/* Request Quote Button */}
                            <div className="mt-6 pt-4 border-t border-[#0F2E2E]/5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOutreachProvider(provider);
                                }}
                                className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-[#0A4D4D] hover:bg-[#0D5F5F] text-white font-medium rounded-xl transition-all shadow-sm hover:shadow-md"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                Request Quote
                              </button>
                              <p className="text-center text-xs text-[#5F7A7A] mt-2">
                                We&apos;ll draft a Good Faith Estimate request for you
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Map */}
              <div className="hidden lg:block">
                <div className="sticky top-24 h-[calc(100vh-8rem)]">
                  {providers.length > 0 && process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN && (
                    <ProvidersMap
                      providers={providers}
                      mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
                      selectedIndex={expandedProvider}
                      onProviderClick={(index) => {
                        const sortedIndex = sortedProviders.findIndex(
                          (p) => p.name === providers[index]?.name
                        );
                        if (sortedIndex !== -1) {
                          setExpandedProvider(sortedIndex);
                        }
                      }}
                      onRequestQuote={(provider) => {
                        const fullProvider = providers.find(
                          (p) => p.name === provider.name && p.address === provider.address
                        );
                        if (fullProvider) {
                          setOutreachProvider(fullProvider);
                        }
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Chat Panel */}
            <ChatPanel context={chatContext} />
          </>
        )}

        {/* Outreach Modal */}
        {outreachProvider && (
          <OutreachModal
            isOpen={!!outreachProvider}
            onClose={() => setOutreachProvider(null)}
            providerName={outreachProvider.name}
            providerAddress={outreachProvider.address}
            providerPhone=""
            procedureName={procedureName}
            estimatedCost={outreachProvider.totalCost}
            insurance={null}
          />
        )}

        {/* Share Toast */}
        {showShareToast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center gap-2 px-4 py-3 bg-[#0F2E2E] text-white rounded-xl shadow-lg">
              <svg className="w-4 h-4 text-[#2DD4BF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">Link copied to clipboard</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FDFCFA] flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-2 border-[#0A4D4D] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-[#5F7A7A]">Loading...</p>
          </div>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
