"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import OutreachModal from "@/components/OutreachModal";
import { ChatPanel } from "@/components/ChatPanel";

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
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Navigation */}
      <nav className="border-b border-[#1a1a1a]/5 sticky top-0 bg-[#FAFAF8]/90 backdrop-blur-md z-40">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-[#1a1a1a] rounded-full flex items-center justify-center group-hover:scale-95 transition-transform">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="font-medium text-[#1a1a1a]">JustPrice</span>
          </Link>

          <button
            onClick={() => router.push("/query")}
            className="flex items-center gap-2 text-sm text-[#1a1a1a]/60 hover:text-[#1a1a1a] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>New Search</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8 md:py-12">
        {/* Loading State */}
        {isLoading && (
          <div className="py-24 text-center">
            <div className="w-8 h-8 border-2 border-[#1a1a1a] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#1a1a1a]/60">Loading pricing data...</p>
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
            <h2 className="font-display text-2xl text-[#1a1a1a] mb-2">Unable to Load Pricing</h2>
            <p className="text-[#1a1a1a]/50 mb-6">{error}</p>
            <button
              onClick={() => router.push("/query")}
              className="px-6 py-3 bg-[#1a1a1a] text-white rounded-full font-medium hover:bg-[#333] transition-colors"
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
              <p className="text-sm tracking-[0.2em] uppercase text-[#1a1a1a]/40 mb-3">
                Price Comparison
              </p>
              <h1 className="font-display text-3xl md:text-4xl font-normal leading-[1.1] tracking-tight text-[#1a1a1a] mb-2">
                {formatProcedureName(procedureName)}
              </h1>
              <p className="text-[#1a1a1a]/50">
                {providers.length} providers in {formatProcedureName(apiResponse.data.metro.replace(/_/g, " "))}
              </p>
            </div>

            {/* Price Range Summary */}
            {priceRange && (
              <div className="mb-8 p-6 bg-white rounded-2xl border border-[#1a1a1a]/5">
                <div className="grid grid-cols-3 gap-6 mb-6">
                  <div>
                    <p className="text-xs text-[#1a1a1a]/40 mb-1">Lowest</p>
                    <p className="font-display text-2xl md:text-3xl text-emerald-600">{formatCurrency(priceRange.min)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-[#1a1a1a]/40 mb-1">Average</p>
                    <p className="font-display text-2xl md:text-3xl text-[#1a1a1a]">{formatCurrency(priceRange.avg)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#1a1a1a]/40 mb-1">Highest</p>
                    <p className="font-display text-2xl md:text-3xl text-[#1a1a1a]/40">{formatCurrency(priceRange.max)}</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-[#1a1a1a]/5 flex items-center justify-between">
                  <span className="text-sm text-[#1a1a1a]/50">Potential savings</span>
                  <span className="font-display text-xl text-emerald-600">
                    {formatCurrency(priceRange.max - priceRange.min)}
                  </span>
                </div>
              </div>
            )}

            {/* Procedure Steps Toggle */}
            {mainSteps.length > 0 && (
              <div className="mb-8">
                <button
                  onClick={() => setShowSteps(!showSteps)}
                  className="flex items-center gap-2 text-sm text-[#1a1a1a]/60 hover:text-[#1a1a1a] transition-colors"
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
                        className="flex items-start gap-3 p-4 bg-white rounded-xl border border-[#1a1a1a]/5"
                      >
                        <div className="w-7 h-7 bg-[#1a1a1a]/5 rounded-lg flex items-center justify-center text-sm font-medium text-[#1a1a1a]/60 flex-shrink-0">
                          {step.step_number}
                        </div>
                        <div className="flex-1">
                          <p className="text-[#1a1a1a]">{step.description}</p>
                          {step.probability < 1 && (
                            <p className="text-xs text-[#1a1a1a]/40 mt-1">
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

            {/* Sort Controls */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-[#1a1a1a]/60">Providers</h2>
              <div className="flex items-center gap-2">
                <label className="text-sm text-[#1a1a1a]/40">Sort:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-3 py-2 bg-white border border-[#1a1a1a]/10 rounded-lg text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#1a1a1a]/20"
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
            <div className="space-y-3">
              {providers.length === 0 && (
                <div className="py-12 text-center bg-white rounded-2xl border border-[#1a1a1a]/5">
                  <p className="text-[#1a1a1a]/50">No provider pricing data available.</p>
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
                    className="bg-white rounded-2xl border border-[#1a1a1a]/5 overflow-hidden hover:border-[#1a1a1a]/10 transition-colors"
                  >
                    {/* Provider Header */}
                    <button
                      onClick={() => toggleProvider(index)}
                      className="w-full p-5 md:p-6 text-left flex items-center justify-between hover:bg-[#1a1a1a]/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 bg-[#F5F5F3] rounded-xl flex items-center justify-center text-[#1a1a1a]/30 flex-shrink-0">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-[#1a1a1a] truncate">{provider.name}</h3>
                          <p className="text-sm text-[#1a1a1a]/40 truncate">{cleanAddress(provider.address)}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-[#1a1a1a]/40">
                              {provider.coverage.score}% coverage
                            </span>
                            <span className="text-[#1a1a1a]/20">·</span>
                            <span className="text-xs text-[#1a1a1a]/40">
                              {mrfCount}/{totalItems} verified
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 ml-4">
                        <div className="text-right">
                          <p className="font-display text-2xl text-[#1a1a1a]">
                            {formatCurrency(provider.totalCost)}
                          </p>
                        </div>
                        <svg
                          className={`w-5 h-5 text-[#1a1a1a]/30 transition-transform ${isExpanded ? "rotate-180" : ""}`}
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
                      <div className="border-t border-[#1a1a1a]/5 p-5 md:p-6 bg-[#FAFAF8]">
                        {/* Coverage Bar */}
                        <div className="mb-6 p-4 bg-white rounded-xl border border-[#1a1a1a]/5">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-[#1a1a1a]/60">Data Coverage</span>
                            <span className="font-display text-lg text-[#1a1a1a]">{provider.coverage.score}%</span>
                          </div>
                          <div className="w-full bg-[#1a1a1a]/5 rounded-full h-1.5">
                            <div
                              className="bg-[#1a1a1a] h-1.5 rounded-full transition-all"
                              style={{ width: `${provider.coverage.score}%` }}
                            />
                          </div>
                          <p className="text-xs text-[#1a1a1a]/40 mt-2">
                            {provider.coverage.matched_items} of {provider.coverage.total_items} cost items matched
                          </p>
                        </div>

                        {/* Cost Breakdown */}
                        <h4 className="text-xs tracking-[0.15em] uppercase text-[#1a1a1a]/40 mb-4">Cost Breakdown</h4>
                        <div className="space-y-3">
                          {Array.from(groupedBreakdown.entries())
                            .sort(([a], [b]) => a - b)
                            .map(([stepNum, items]) => {
                              const stepDescription = stepToDescription.get(stepNum) || `Step ${stepNum}`;
                              const stepTotal = items.reduce((sum, item) => sum + item.cost, 0);

                              return (
                                <div key={stepNum} className="bg-white rounded-xl border border-[#1a1a1a]/5 overflow-hidden">
                                  <div className="px-4 py-3 border-b border-[#1a1a1a]/5 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="w-6 h-6 bg-[#1a1a1a]/5 rounded-md flex items-center justify-center text-xs font-medium text-[#1a1a1a]/60">
                                        {stepNum}
                                      </span>
                                      <span className="text-sm font-medium text-[#1a1a1a]">{stepDescription}</span>
                                    </div>
                                    <span className="font-display text-[#1a1a1a]">{formatCurrency(stepTotal)}</span>
                                  </div>

                                  <div className="divide-y divide-[#1a1a1a]/5">
                                    {items.map((item, itemIndex) => {
                                      const subStep = clusterToSubStep.get(item.cluster_id);
                                      const badge = getPriceTypeBadge(item.price_type);

                                      return (
                                        <div key={itemIndex} className="px-4 py-3 flex items-start justify-between gap-3">
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                              {subStep && (
                                                <span className="text-xs text-[#1a1a1a]/40 capitalize">
                                                  {subStep.category.replace(/_/g, " ")}
                                                </span>
                                              )}
                                              <span className={`text-xs ${badge.isVerified ? "text-emerald-600" : "text-[#1a1a1a]/40"}`}>
                                                {badge.label}
                                              </span>
                                            </div>
                                            <p className="text-sm text-[#1a1a1a]/70 truncate">
                                              {subStep?.service_description || item.cluster_id}
                                            </p>
                                            {item.cash_pay && item.cash_pay !== item.cost && (
                                              <p className="text-xs text-[#1a1a1a]/40 mt-1">
                                                Cash: {formatCurrency(item.cash_pay)}
                                              </p>
                                            )}
                                          </div>
                                          <div className="text-right flex-shrink-0">
                                            <p className="font-medium text-[#1a1a1a]">{formatCurrency(item.cost)}</p>
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
                        <div className="mt-6 pt-4 border-t border-[#1a1a1a]/5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOutreachProvider(provider);
                            }}
                            className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-[#1a1a1a] hover:bg-[#333] text-white font-medium rounded-xl transition-all"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Request Quote
                          </button>
                          <p className="text-center text-xs text-[#1a1a1a]/40 mt-2">
                            We&apos;ll draft a Good Faith Estimate request for you
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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
      </main>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-2 border-[#1a1a1a] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-[#1a1a1a]/60">Loading...</p>
          </div>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
