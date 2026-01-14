/**
 * Hospital Price Transparency Ingestion Module
 *
 * This module provides efficient parsing and database operations
 * for CMS Hospital Price Transparency machine-readable files (MRFs).
 *
 * Features:
 * - Streaming JSON parser for large files (>50MB handled efficiently)
 * - CSV parser supporting both Tall and Wide formats
 * - MongoDB batch operations with upsert support
 * - Support for both v2.2 and v3.0 CMS schema versions
 *
 * Usage:
 *   import { streamParseJsonFile, parseCSVFile, batchInsertCharges } from './lib/ingestion';
 *
 * Or run the CLI script:
 *   bun run ingest:prices
 */

// JSON parsing
export {
  detectFileMetadata,
  parseJsonFile,
  streamParseJsonFile,
  validateChargeItem,
  type ParsedHospitalData,
  type StreamingParserOptions,
} from './json-stream-parser';

// CSV parsing
export {
  detectCSVFormat,
  parseCSVFile,
  parseCSVTallFormat,
  parseCSVWideFormat,
  type CSVHospitalMetadata,
  type CSVParserOptions,
  type CSVParseResult,
} from './csv-stream-parser';

// Lucile Packard non-standard format
export {
  isLucilePackardFormat,
  parseLucilePackardFile,
  type LucilePackardParseOptions,
  type LucilePackardParseResult,
} from './lucile-packard-parser';

// Database operations
export {
  initializeHospitalPriceCollections,
  getHospitalsCollection,
  getChargesCollection,
  getModifiersCollection,
  chargeToDocument,
  batchInsertCharges,
  batchInsertModifiers,
  upsertHospital,
  deleteHospitalCharges,
  deleteHospitalModifiers,
  getCollectionStats,
  searchChargesByCode,
  searchChargesByDescription,
  getPriceStatsByCode,
  getUniquePayers,
  getAllHospitals,
  getHospitalById,
} from './hospital-prices-db';
