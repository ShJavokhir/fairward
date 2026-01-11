"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect, useMemo } from "react";
import OutreachModal from "@/components/OutreachModal";

// ============================================================================
// TypeScript Interfaces matching the actual API response
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
  price_type: string; // "MRF" or "ESTIMATED_FALLBACK"
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
  // Remove extra quotes and clean up the address format
  return address
    .replace(/^"|"$/g, "")
    .replace(/", ,/g, ",")
    .replace(/,\s+\d{5}$/, "")
    .trim();
}

function getPriceTypeBadge(priceType: string): { bg: string; text: string; label: string } {
  switch (priceType?.toUpperCase()) {
    case "MRF":
      return { bg: "bg-emerald-100", text: "text-emerald-700", label: "Insurance Rate" };
    case "ESTIMATED_FALLBACK":
      return { bg: "bg-amber-100", text: "text-amber-700", label: "Estimated" };
    default:
      return { bg: "bg-slate-100", text: "text-slate-600", label: priceType || "Unknown" };
  }
}

function getCategoryIcon(category: string): string {
  switch (category?.toLowerCase()) {
    case "surgery":
      return "M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z";
    case "anesthesia":
      return "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z";
    case "medication":
      return "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z";
    case "lab":
      return "M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5";
    case "evaluation":
      return "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z";
    case "room_and_board":
      return "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25";
    case "procedure":
      return "M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z";
    default:
      return "M12 6v6m0 0v6m0-6h6m-6 0H6";
  }
}

function getCategoryColor(category: string): string {
  switch (category?.toLowerCase()) {
    case "surgery":
      return "bg-red-100 text-red-700";
    case "anesthesia":
      return "bg-purple-100 text-purple-700";
    case "medication":
      return "bg-blue-100 text-blue-700";
    case "lab":
      return "bg-cyan-100 text-cyan-700";
    case "evaluation":
      return "bg-green-100 text-green-700";
    case "room_and_board":
      return "bg-orange-100 text-orange-700";
    case "procedure":
      return "bg-pink-100 text-pink-700";
    default:
      return "bg-slate-100 text-slate-700";
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

  // Extract data from response
  const procedureName = apiResponse?.data?.procedure || procedureId;
  const mainSteps = apiResponse?.data?.results?.bundle?.enriched_bundle?.main_steps || [];
  const subSteps = apiResponse?.data?.results?.bundle?.enriched_bundle?.sub_steps || [];
  const providers = apiResponse?.data?.results?.results || [];

  // Create a map of cluster_id to sub_step for easy lookup
  const clusterToSubStep = useMemo(() => {
    const map = new Map<string, SubStep>();
    subSteps.forEach(step => {
      map.set(step.cluster_id, step);
    });
    return map;
  }, [subSteps]);

  // Create a map of step_number to main_step description
  const stepToDescription = useMemo(() => {
    const map = new Map<number, string>();
    mainSteps.forEach(step => {
      map.set(step.step_number, step.description);
    });
    return map;
  }, [mainSteps]);

  // Sort providers
  const sortedProviders = useMemo(() => {
    const sorted = [...providers];
    switch (sortBy) {
      case "price_low":
        sorted.sort((a, b) => a.totalCost - b.totalCost);
        break;
      case "price_high":
        sorted.sort((a, b) => b.totalCost - a.totalCost);
        break;
      case "coverage":
        sorted.sort((a, b) => b.coverage.score - a.coverage.score);
        break;
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    return sorted;
  }, [providers, sortBy]);

  // Calculate stats
  const priceRange = providers.length > 0 ? {
    min: Math.min(...providers.map(p => p.totalCost)),
    max: Math.max(...providers.map(p => p.totalCost)),
    avg: providers.reduce((sum, p) => sum + p.totalCost, 0) / providers.length
  } : null;

  // Group breakdown items by main step
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 md:p-6">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl" />
      </div>

      {/* Main content */}
      <div className="relative max-w-5xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => router.push("/query")}
          className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors group"
        >
          <svg
            className="w-4 h-4 transition-transform group-hover:-translate-x-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">Search Again</span>
        </button>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-indigo-500/10 p-12 border border-white/50">
            <div className="flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-slate-600 font-medium">Loading pricing data...</p>
              <p className="text-slate-400 text-sm mt-1">Searching hospitals and providers</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-indigo-500/10 p-8 border border-white/50">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Unable to Load Pricing</h2>
              <p className="text-slate-500 mb-6">{error}</p>
              <button
                onClick={() => router.push("/query")}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                Try Another Search
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {!isLoading && !error && apiResponse && (
          <>
            {/* Header Card */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-indigo-500/10 p-6 md:p-8 border border-white/50 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 flex-shrink-0">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl md:text-2xl font-bold text-slate-800 mb-1">
                    {formatProcedureName(procedureName)}
                  </h1>
                  <p className="text-slate-500 text-sm">
                    {providers.length} providers found in {formatProcedureName(apiResponse.data.metro.replace(/_/g, " "))}
                  </p>
                </div>
              </div>

              {/* Price Range Summary */}
              {priceRange && (
                <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Lowest</p>
                      <p className="text-xl md:text-2xl font-bold text-emerald-600">{formatCurrency(priceRange.min)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-slate-500 mb-1">Average</p>
                      <p className="text-xl md:text-2xl font-bold text-slate-700">{formatCurrency(priceRange.avg)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500 mb-1">Highest</p>
                      <p className="text-xl md:text-2xl font-bold text-red-500">{formatCurrency(priceRange.max)}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-indigo-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">Potential Savings</span>
                      <span className="text-lg font-bold text-emerald-600">
                        {formatCurrency(priceRange.max - priceRange.min)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Main Steps Toggle */}
              {mainSteps.length > 0 && (
                <div className="mt-6">
                  <button
                    onClick={() => setShowSteps(!showSteps)}
                    className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    <svg
                      className={`w-4 h-4 transition-transform ${showSteps ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    {showSteps ? "Hide" : "Show"} Procedure Steps ({mainSteps.length})
                  </button>

                  {showSteps && (
                    <div className="mt-4 space-y-3">
                      {mainSteps.map((step) => (
                        <div
                          key={step.step_number}
                          className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-100"
                        >
                          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-semibold text-sm flex-shrink-0">
                            {step.step_number}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-700">{step.description}</p>
                            {step.probability < 1 && (
                              <p className="text-xs text-slate-400 mt-1">
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
            </div>

            {/* Sort Controls */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-700">Provider Pricing</h2>
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-500">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-3 py-2 bg-white/80 backdrop-blur rounded-xl border border-white/50 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Provider Results */}
            <div className="space-y-4">
              {providers.length === 0 && (
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-8 border border-white/50 text-center">
                  <p className="text-slate-500">No provider pricing data available for this procedure.</p>
                </div>
              )}

              {sortedProviders.map((provider, index) => {
                const groupedBreakdown = getGroupedBreakdown(provider.breakdown);
                const isExpanded = expandedProvider === index;
                const mrfCount = provider.breakdown.filter(b => b.price_type === "MRF").length;
                const totalItems = provider.breakdown.length;

                return (
                  <div
                    key={index}
                    className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg shadow-indigo-500/5 border border-white/50 overflow-hidden hover:shadow-xl transition-all"
                  >
                    {/* Provider Header */}
                    <button
                      onClick={() => toggleProvider(index)}
                      className="w-full p-4 md:p-6 text-left flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center text-slate-500 flex-shrink-0">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-800 truncate">{provider.name}</h3>
                          <p className="text-sm text-slate-500 truncate">{cleanAddress(provider.address)}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                              {provider.coverage.score}% coverage
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              {mrfCount}/{totalItems} verified
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <div className="text-right">
                          <p className="text-xl md:text-2xl font-bold text-slate-800">
                            {formatCurrency(provider.totalCost)}
                          </p>
                          <p className="text-xs text-slate-400">Total Estimate</p>
                        </div>
                        <svg
                          className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
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
                      <div className="border-t border-slate-100 p-4 md:p-6 bg-slate-50/30">
                        {/* Coverage Info */}
                        <div className="mb-6 p-4 bg-white rounded-xl border border-slate-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-600">Data Coverage</span>
                            <span className="text-lg font-bold text-emerald-600">{provider.coverage.score}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className="bg-emerald-500 h-2 rounded-full transition-all"
                              style={{ width: `${provider.coverage.score}%` }}
                            />
                          </div>
                          <p className="text-xs text-slate-400 mt-2">
                            {provider.coverage.matched_items} of {provider.coverage.total_items} cost items matched
                          </p>
                        </div>

                        {/* Cost Breakdown by Main Step */}
                        <h4 className="text-sm font-semibold text-slate-600 mb-4">Cost Breakdown</h4>
                        <div className="space-y-4">
                          {Array.from(groupedBreakdown.entries())
                            .sort(([a], [b]) => a - b)
                            .map(([stepNum, items]) => {
                              const stepDescription = stepToDescription.get(stepNum) || `Step ${stepNum}`;
                              const stepTotal = items.reduce((sum, item) => sum + item.cost, 0);

                              return (
                                <div key={stepNum} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                                  {/* Step Header */}
                                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="w-6 h-6 bg-indigo-100 rounded-md flex items-center justify-center text-xs font-semibold text-indigo-600">
                                        {stepNum}
                                      </span>
                                      <span className="font-medium text-slate-700">{stepDescription}</span>
                                    </div>
                                    <span className="font-semibold text-slate-800">{formatCurrency(stepTotal)}</span>
                                  </div>

                                  {/* Step Items */}
                                  <div className="divide-y divide-slate-50">
                                    {items.map((item, itemIndex) => {
                                      const subStep = clusterToSubStep.get(item.cluster_id);
                                      const badge = getPriceTypeBadge(item.price_type);

                                      return (
                                        <div key={itemIndex} className="px-4 py-3 flex items-start justify-between gap-3">
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                              {subStep && (
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(subStep.category)}`}>
                                                  {subStep.category.replace(/_/g, " ")}
                                                </span>
                                              )}
                                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
                                                {badge.label}
                                              </span>
                                            </div>
                                            <p className="text-sm text-slate-600 truncate">
                                              {subStep?.service_description || item.cluster_id}
                                            </p>
                                            {item.payer && (
                                              <p className="text-xs text-slate-400 mt-1">
                                                via {item.payer.replace(/[\[\]]/g, "")}
                                              </p>
                                            )}
                                            {item.network_prices.length > 0 && (
                                              <div className="mt-2 text-xs text-slate-400">
                                                <span className="font-medium">Network range: </span>
                                                {formatCurrency(item.network_prices[0].min)} - {formatCurrency(item.network_prices[0].max)}
                                              </div>
                                            )}
                                            {item.cash_pay && item.cash_pay !== item.cost && (
                                              <div className="mt-1 text-xs text-blue-600">
                                                Cash price: {formatCurrency(item.cash_pay)}
                                              </div>
                                            )}
                                          </div>
                                          <div className="text-right flex-shrink-0">
                                            <p className="font-semibold text-slate-800">{formatCurrency(item.cost)}</p>
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
                        <div className="mt-6 pt-4 border-t border-slate-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOutreachProvider(provider);
                            }}
                            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Request Quote from {provider.name.split(" ").slice(0, 3).join(" ")}
                          </button>
                          <p className="text-center text-xs text-slate-400 mt-2">
                            We&apos;ll draft a Good Faith Estimate request email for you
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </>
        )}

        {/* Outreach Modal */}
        {outreachProvider && (
          <OutreachModal
            isOpen={!!outreachProvider}
            onClose={() => setOutreachProvider(null)}
            providerName={outreachProvider.name}
            providerAddress={outreachProvider.address}
            providerPhone="" // TODO: Add phone number to provider data from API
            procedureName={procedureName}
            estimatedCost={outreachProvider.totalCost}
            insurance={null}
          />
        )}

        {/* Progress indicator */}
        <div className="flex justify-center mt-8 gap-2">
          <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full" />
          <div className="w-8 h-1.5 bg-indigo-500 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-600 font-medium">Loading...</p>
          </div>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
