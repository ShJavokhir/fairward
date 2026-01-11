import { Collection, IndexDescription } from "mongodb";
import { getDatabase } from "./mongodb";
import { PricingCacheDocument, PricingResponse, CacheResult } from "./types/pricing";

const COLLECTION_NAME = "pricing_cache";
const CACHE_VERSION = "1.0.0";

// Cache TTL in milliseconds (24 hours default)
const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Get cache TTL from environment or use default
const getCacheTTL = (): number => {
  const envTTL = process.env.PRICING_CACHE_TTL_HOURS;
  if (envTTL) {
    const hours = parseInt(envTTL, 10);
    if (!isNaN(hours) && hours > 0) {
      return hours * 60 * 60 * 1000;
    }
  }
  return DEFAULT_CACHE_TTL_MS;
};

// Generate a unique cache key from query parameters
export const generateCacheKey = (
  procedureId: string,
  metroSlug: string,
  priceType: string
): string => {
  return `${procedureId}:${metroSlug}:${priceType}`.toLowerCase();
};

// Get the pricing cache collection
async function getCollection(): Promise<Collection<PricingCacheDocument>> {
  const db = await getDatabase("main");
  return db.collection<PricingCacheDocument>(COLLECTION_NAME);
}

// Initialize indexes (call this once on startup or lazily)
let indexesInitialized = false;
async function ensureIndexes(): Promise<void> {
  if (indexesInitialized) return;

  try {
    const collection = await getCollection();

    const indexes: IndexDescription[] = [
      // Unique index on cache key for fast lookups
      { key: { cacheKey: 1 }, unique: true },
      // Compound index for queries by individual fields
      { key: { procedureId: 1, metroSlug: 1, priceType: 1 } },
      // TTL index for automatic document expiration
      { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
      // Index for analytics/monitoring
      { key: { createdAt: -1 } },
      { key: { hitCount: -1 } },
    ];

    // Create indexes if they don't exist
    for (const indexSpec of indexes) {
      try {
        // Only include options that are defined
        const options: { unique?: boolean; expireAfterSeconds?: number; background: boolean } = {
          background: true,
        };
        if (indexSpec.unique !== undefined) {
          options.unique = indexSpec.unique;
        }
        if (indexSpec.expireAfterSeconds !== undefined) {
          options.expireAfterSeconds = indexSpec.expireAfterSeconds;
        }
        await collection.createIndex(indexSpec.key, options);
      } catch (error: unknown) {
        // Ignore duplicate key errors (index already exists)
        if (error instanceof Error && !error.message.includes("already exists")) {
          console.error(`Failed to create index:`, indexSpec, error);
        }
      }
    }

    indexesInitialized = true;
    console.log("[PricingCache] Indexes initialized successfully");
  } catch (error) {
    console.error("[PricingCache] Failed to initialize indexes:", error);
    // Don't throw - cache should work without indexes, just slower
  }
}

// Get cached pricing data
export async function getCachedPricing(
  procedureId: string,
  metroSlug: string,
  priceType: string
): Promise<PricingCacheDocument | null> {
  await ensureIndexes();

  const cacheKey = generateCacheKey(procedureId, metroSlug, priceType);

  try {
    const collection = await getCollection();
    const now = new Date();

    // Find and update hit count atomically
    const result = await collection.findOneAndUpdate(
      {
        cacheKey,
        expiresAt: { $gt: now }, // Only return non-expired documents
        dataVersion: CACHE_VERSION, // Ensure version compatibility
      },
      {
        $inc: { hitCount: 1 },
        $set: { lastAccessedAt: now },
      },
      {
        returnDocument: "after",
      }
    );

    if (result) {
      console.log(`[PricingCache] Cache HIT for ${cacheKey} (hits: ${result.hitCount})`);
      return result;
    }

    console.log(`[PricingCache] Cache MISS for ${cacheKey}`);
    return null;
  } catch (error) {
    console.error("[PricingCache] Error reading from cache:", error);
    // Return null on error - let the caller fetch fresh data
    return null;
  }
}

// Store pricing data in cache
export async function cachePricingData(
  procedureId: string,
  metroSlug: string,
  priceType: string,
  data: PricingResponse,
  fetchDurationMs: number
): Promise<boolean> {
  await ensureIndexes();

  const cacheKey = generateCacheKey(procedureId, metroSlug, priceType);
  const ttl = getCacheTTL();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttl);

  // Calculate provider count for analytics
  const providerCount = data?.data?.results?.results?.length || 0;

  try {
    const collection = await getCollection();

    // Use upsert for atomic insert/update (handles race conditions)
    // $set updates fields on every operation
    // $setOnInsert only sets fields on insert (not update)
    const result = await collection.updateOne(
      { cacheKey },
      {
        $set: {
          procedureId: procedureId.toLowerCase(),
          metroSlug: metroSlug.toLowerCase(),
          priceType: priceType.toLowerCase(),
          data,
          updatedAt: now,
          expiresAt,
          fetchDurationMs,
          providerCount,
          dataVersion: CACHE_VERSION,
        },
        $setOnInsert: {
          cacheKey,
          createdAt: now,
          hitCount: 0,
        },
      },
      { upsert: true }
    );

    const wasInserted = result.upsertedCount > 0;
    const wasUpdated = result.modifiedCount > 0;

    console.log(
      `[PricingCache] ${wasInserted ? "INSERTED" : wasUpdated ? "UPDATED" : "NO-OP"} ` +
      `cache for ${cacheKey} (${providerCount} providers, expires: ${expiresAt.toISOString()})`
    );

    return true;
  } catch (error) {
    console.error("[PricingCache] Error writing to cache:", error);
    // Return false on error - don't throw, let the request continue
    return false;
  }
}

// Fetch from external API with timing
async function fetchFromExternalAPI(
  procedureId: string,
  metroSlug: string,
  priceType: string
): Promise<{ data: PricingResponse; durationMs: number }> {
  const startTime = Date.now();

  const response = await fetch(
    "https://simple-backend-ret2i2nfuq-uc.a.run.app/get_results",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        procedure_id: procedureId,
        metro_slug: metroSlug,
        price_type: priceType,
      }),
    }
  );

  const durationMs = Date.now() - startTime;

  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      `[PricingCache] External API error: ${response.status}`,
      errorText
    );
    throw new Error(`External API error: ${response.status}`);
  }

  const data = await response.json();
  console.log(
    `[PricingCache] Fetched from external API in ${durationMs}ms`
  );

  return { data, durationMs };
}

// Main function: Get pricing with cache (cache-aside pattern)
export async function getPricingWithCache(
  procedureId: string,
  metroSlug: string,
  priceType: string
): Promise<CacheResult<PricingResponse>> {
  // Step 1: Try to get from cache
  const cached = await getCachedPricing(procedureId, metroSlug, priceType);

  if (cached) {
    const cacheAge = Date.now() - cached.createdAt.getTime();
    return {
      hit: true,
      data: cached.data,
      fromCache: true,
      cacheAge,
    };
  }

  // Step 2: Cache miss - fetch from external API
  const { data, durationMs } = await fetchFromExternalAPI(
    procedureId,
    metroSlug,
    priceType
  );

  // Step 3: Store in cache (fire and forget - don't block response)
  // Using void to explicitly ignore the promise
  void cachePricingData(procedureId, metroSlug, priceType, data, durationMs).catch(
    (error) => {
      console.error("[PricingCache] Background cache write failed:", error);
    }
  );

  return {
    hit: false,
    data,
    fromCache: false,
  };
}

// Utility: Invalidate cache for a specific query
export async function invalidateCache(
  procedureId: string,
  metroSlug: string,
  priceType: string
): Promise<boolean> {
  const cacheKey = generateCacheKey(procedureId, metroSlug, priceType);

  try {
    const collection = await getCollection();
    const result = await collection.deleteOne({ cacheKey });

    console.log(
      `[PricingCache] Invalidated cache for ${cacheKey}: ${result.deletedCount > 0}`
    );
    return result.deletedCount > 0;
  } catch (error) {
    console.error("[PricingCache] Error invalidating cache:", error);
    return false;
  }
}

// Utility: Get cache statistics
export async function getCacheStats(): Promise<{
  totalEntries: number;
  totalHits: number;
  avgFetchDuration: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}> {
  try {
    const collection = await getCollection();

    const stats = await collection
      .aggregate([
        {
          $group: {
            _id: null,
            totalEntries: { $sum: 1 },
            totalHits: { $sum: "$hitCount" },
            avgFetchDuration: { $avg: "$fetchDurationMs" },
            oldestEntry: { $min: "$createdAt" },
            newestEntry: { $max: "$createdAt" },
          },
        },
      ])
      .toArray();

    if (stats.length === 0) {
      return {
        totalEntries: 0,
        totalHits: 0,
        avgFetchDuration: 0,
        oldestEntry: null,
        newestEntry: null,
      };
    }

    return {
      totalEntries: stats[0].totalEntries,
      totalHits: stats[0].totalHits,
      avgFetchDuration: Math.round(stats[0].avgFetchDuration || 0),
      oldestEntry: stats[0].oldestEntry,
      newestEntry: stats[0].newestEntry,
    };
  } catch (error) {
    console.error("[PricingCache] Error getting cache stats:", error);
    throw error;
  }
}

// Utility: Clear all cache entries
export async function clearAllCache(): Promise<number> {
  try {
    const collection = await getCollection();
    const result = await collection.deleteMany({});
    console.log(`[PricingCache] Cleared ${result.deletedCount} cache entries`);
    return result.deletedCount;
  } catch (error) {
    console.error("[PricingCache] Error clearing cache:", error);
    throw error;
  }
}
