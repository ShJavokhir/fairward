import * as crypto from "crypto";
import type { BillAnalysis } from "@/lib/types/bill-analysis";

interface CacheEntry {
  data: BillAnalysis;
  timestamp: number;
}

// Simple in-memory cache - cleared when app restarts
const cache = new Map<string, CacheEntry>();

// Cache TTL: 1 hour (doesn't really matter since it clears on restart anyway)
const CACHE_TTL_MS = 60 * 60 * 1000;

export function hashFileContent(base64: string): string {
  return crypto.createHash("sha256").update(base64).digest("hex").slice(0, 16);
}

export function getCachedAnalysis(hash: string): BillAnalysis | null {
  const entry = cache.get(hash);
  if (!entry) return null;

  // Check if expired
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(hash);
    return null;
  }

  return entry.data;
}

export function setCachedAnalysis(hash: string, data: BillAnalysis): void {
  cache.set(hash, {
    data,
    timestamp: Date.now(),
  });
}

export function getCacheStats() {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}
