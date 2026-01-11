// Types for the pricing data structures

export interface NetworkPrice {
  network: string;
  min: number;
  max: number;
  mean: number;
  median: number;
  count: number;
}

export interface CostBreakdownItem {
  cost: number;
  cash_pay: number | null;
  cluster_id: string;
  main_step_number: number;
  step_number: number;
  sub_step_number: number;
  price_type: "MRF" | "ESTIMATED_FALLBACK";
  payer: string | null;
  network_prices: NetworkPrice[];
}

export interface ProviderResult {
  name: string;
  address: string;
  totalCost: number;
  distance_miles: number;
  coverage: {
    score: number;
    matched_items: number;
    total_items: number;
  };
  breakdown: CostBreakdownItem[];
}

export interface SubStep {
  step_number: number;
  service_description: string;
  category: "surgery" | "anesthesia" | "medication" | "lab" | "evaluation" | "room_and_board" | "procedure";
  cluster_id: string;
  tags: string[];
  key_words: string[];
  minimum_reasonable_price: number;
  maximum_reasonable_price: number;
  probability: number;
  representative_id: string;
}

export interface MainStep {
  step_number: number;
  description: string;
  probability: number;
}

export interface EnrichedBundle {
  main_steps: MainStep[];
  sub_steps: SubStep[];
  location_info: Record<string, unknown>;
}

export interface QueryStats {
  bytes_processed: number;
  processing_time_seconds: number;
  search_time_seconds: number;
}

export interface BundleWithClusters {
  query_stats: QueryStats;
}

export interface PricingResults {
  bundle: {
    enriched_bundle: EnrichedBundle;
    bundle_with_clusters: BundleWithClusters;
  };
  results: ProviderResult[];
}

export interface PricingData {
  metro: string;
  price_type: string;
  procedure: string;
  results: PricingResults;
  source: string;
}

export interface PricingResponse {
  success: boolean;
  message: string;
  data: PricingData;
}

// Cache document schema
export interface PricingCacheDocument {
  _id?: string;
  cacheKey: string;
  procedureId: string;
  metroSlug: string;
  priceType: string;
  data: PricingResponse;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  hitCount: number;
  fetchDurationMs: number;
  providerCount: number;
  dataVersion: string;
}

export interface CacheResult<T> {
  hit: boolean;
  data: T;
  fromCache: boolean;
  cacheAge?: number; // milliseconds since cached
}
