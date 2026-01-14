#!/usr/bin/env bun
/**
 * Hospital Price Transparency Data Ingestion Script
 *
 * Efficiently reads hospital MRF (Machine Readable Files) in JSON or CSV format
 * and ingests them into MongoDB with proper batching and progress tracking.
 *
 * Usage:
 *   bun run scripts/ingest-hospital-prices.ts [options]
 *
 * Options:
 *   --file <path>        Ingest a specific file
 *   --dir <path>         Ingest all files in directory (default: public_prices)
 *   --batch-size <n>     Batch size for DB operations (default: 500)
 *   --dry-run            Parse files without writing to database
 *   --init-only          Only initialize collections/indexes, don't ingest
 *   --stats              Show collection statistics
 *   --verbose            Show detailed progress
 *   --max-items <n>      Maximum items to process (for testing)
 *   --skip-existing      Skip hospitals that already exist
 *
 * Examples:
 *   bun run scripts/ingest-hospital-prices.ts
 *   bun run scripts/ingest-hospital-prices.ts --file ./public_prices/hospital.json
 *   bun run scripts/ingest-hospital-prices.ts --dry-run --verbose
 *   bun run scripts/ingest-hospital-prices.ts --stats
 */

import { readdir, stat } from 'fs/promises';
import { join, basename, extname } from 'path';
import { closeConnection } from '../lib/mongodb';
import {
  detectFileMetadata,
  streamParseJsonFile,
  parseJsonFile,
  type ParsedHospitalData,
} from '../lib/ingestion/json-stream-parser';
import {
  parseCSVFile,
  detectCSVFormat,
  type CSVParseResult,
} from '../lib/ingestion/csv-stream-parser';
import {
  isLucilePackardFormat,
  parseLucilePackardFile,
} from '../lib/ingestion/lucile-packard-parser';
import {
  initializeHospitalPriceCollections,
  getCollectionStats,
  upsertHospital,
  batchInsertCharges,
  batchInsertModifiers,
  chargeToDocument,
  deleteHospitalCharges,
  deleteHospitalModifiers,
  getHospitalById,
} from '../lib/ingestion/hospital-prices-db';
import type {
  HospitalDocument,
  StandardChargeDocument,
  ModifierDocument,
  IngestionStats,
  IngestionError,
  IngestionOptions,
  StandardChargeInformationV2,
  StandardChargeInformationV3,
  ModifierInformationV2,
  ModifierInformationV3,
  StateCode,
} from '../lib/types/hospital-prices';

// Default configuration
const DEFAULT_PRICES_DIR = './public_prices';
const DEFAULT_BATCH_SIZE = 500;
const SUPPORTED_EXTENSIONS = ['.json', '.csv'];

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset): void {
  console.log(`${color}${message}${colors.reset}`);
}

function logProgress(current: number, total: number | null, label: string): void {
  const percent = total ? ((current / total) * 100).toFixed(1) : '?';
  const totalStr = total ? total.toLocaleString() : '?';
  process.stdout.write(
    `\r${colors.cyan}[${percent}%]${colors.reset} ${label}: ${current.toLocaleString()} / ${totalStr}    `
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = ((ms % 60000) / 1000).toFixed(0);
  return `${mins}m ${secs}s`;
}

/**
 * Generate hospital ID from filename
 */
function generateHospitalId(filename: string): string {
  // Remove extension and clean up
  const name = basename(filename, extname(filename));
  // Remove common suffixes
  return name
    .replace(/_standardcharges$/i, '')
    .replace(/_standard_charges$/i, '')
    .replace(/_charges$/i, '')
    .replace(/_mrf$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Parse command line arguments
 */
function parseArgs(): {
  file?: string;
  dir: string;
  batchSize: number;
  dryRun: boolean;
  initOnly: boolean;
  stats: boolean;
  verbose: boolean;
  maxItems?: number;
  skipExisting: boolean;
} {
  const args = process.argv.slice(2);
  const result = {
    dir: DEFAULT_PRICES_DIR,
    batchSize: DEFAULT_BATCH_SIZE,
    dryRun: false,
    initOnly: false,
    stats: false,
    verbose: false,
    skipExisting: false,
  } as ReturnType<typeof parseArgs>;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--file':
        result.file = args[++i];
        break;
      case '--dir':
        result.dir = args[++i];
        break;
      case '--batch-size':
        result.batchSize = parseInt(args[++i], 10);
        break;
      case '--dry-run':
        result.dryRun = true;
        break;
      case '--init-only':
        result.initOnly = true;
        break;
      case '--stats':
        result.stats = true;
        break;
      case '--verbose':
        result.verbose = true;
        break;
      case '--max-items':
        result.maxItems = parseInt(args[++i], 10);
        break;
      case '--skip-existing':
        result.skipExisting = true;
        break;
      case '--help':
        console.log(`
Hospital Price Transparency Data Ingestion Script

Usage: bun run scripts/ingest-hospital-prices.ts [options]

Options:
  --file <path>        Ingest a specific file
  --dir <path>         Ingest all files in directory (default: ${DEFAULT_PRICES_DIR})
  --batch-size <n>     Batch size for DB operations (default: ${DEFAULT_BATCH_SIZE})
  --dry-run            Parse files without writing to database
  --init-only          Only initialize collections/indexes, don't ingest
  --stats              Show collection statistics
  --verbose            Show detailed progress
  --max-items <n>      Maximum items to process (for testing)
  --skip-existing      Skip hospitals that already exist
  --help               Show this help message
`);
        process.exit(0);
    }
  }

  return result;
}

/**
 * Find all price files in a directory
 */
async function findPriceFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await readdir(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const fileStat = await stat(fullPath);

      if (fileStat.isFile()) {
        const ext = extname(entry).toLowerCase();
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      log(`Directory not found: ${dir}`, colors.red);
    } else {
      throw error;
    }
  }

  return files.sort();
}

/**
 * Ingest a single file
 */
async function ingestFile(
  filePath: string,
  options: {
    batchSize: number;
    dryRun: boolean;
    verbose: boolean;
    maxItems?: number;
    skipExisting: boolean;
  }
): Promise<IngestionStats> {
  const startTime = Date.now();
  const hospitalId = generateHospitalId(filePath);

  const stats: IngestionStats = {
    hospitalId,
    sourceFile: filePath,
    version: 'unknown',
    startTime: new Date(),
    status: 'running',
    totalCharges: 0,
    processedCharges: 0,
    insertedCharges: 0,
    updatedCharges: 0,
    skippedCharges: 0,
    failedCharges: 0,
    totalModifiers: 0,
    processedModifiers: 0,
    errors: [],
  };

  try {
    // Detect file format
    const metadata = await detectFileMetadata(filePath);
    log(`\n${colors.bright}Processing: ${basename(filePath)}${colors.reset}`);
    log(`  Format: ${metadata.format}, Size: ${formatBytes(metadata.sizeBytes)}, Version: ${metadata.version}`);

    if (metadata.estimatedRecords) {
      log(`  Estimated records: ~${metadata.estimatedRecords.toLocaleString()}`);
      stats.totalCharges = metadata.estimatedRecords;
    }

    // Check if hospital exists
    if (options.skipExisting && !options.dryRun) {
      const existingHospital = await getHospitalById(hospitalId);
      if (existingHospital) {
        log(`  ${colors.yellow}Skipping - hospital already exists${colors.reset}`);
        stats.status = 'completed';
        stats.endTime = new Date();
        return stats;
      }
    }

    // Batch accumulator
    let chargeBatch: StandardChargeDocument[] = [];
    let modifierBatch: ModifierDocument[] = [];
    let hospitalDoc: HospitalDocument | null = null;
    let hospitalName = 'Unknown Hospital';

    const flushChargeBatch = async () => {
      if (chargeBatch.length === 0) return;

      if (!options.dryRun) {
        const result = await batchInsertCharges(chargeBatch, { upsert: true });
        stats.insertedCharges += result.inserted;
        stats.updatedCharges += result.modified;
        stats.failedCharges += result.errors;
      } else {
        stats.insertedCharges += chargeBatch.length;
      }

      chargeBatch = [];
    };

    const flushModifierBatch = async () => {
      if (modifierBatch.length === 0) return;

      if (!options.dryRun) {
        const result = await batchInsertModifiers(modifierBatch);
        stats.processedModifiers += result.inserted + result.modified;
      } else {
        stats.processedModifiers += modifierBatch.length;
      }

      modifierBatch = [];
    };

    // Process based on format
    if (metadata.format === 'json') {
      // Check for Lucile Packard's non-standard format by reading a sample
      const file = Bun.file(filePath);
      const sampleData = await file.json();
      const isLucilePackard = isLucilePackardFormat(sampleData);

      if (isLucilePackard) {
        log(`  ${colors.cyan}Detected: Lucile Packard non-standard format${colors.reset}`);

        // Extract hospital name before processing so it's available in callbacks
        hospitalName = sampleData['HOSPITAL NAME'] || 'Unknown Hospital';
        stats.version = String(sampleData['VERSION'] || '2.2.0');

        // Use specialized Lucile Packard parser
        const parsed = await parseLucilePackardFile(filePath, {
          onCharge: async (charge, index) => {
            stats.processedCharges++;

            const docs = chargeToDocument(
              charge,
              hospitalId,
              hospitalName,
              stats.version
            );

            chargeBatch.push(...docs);

            if (chargeBatch.length >= options.batchSize) {
              await flushChargeBatch();
            }
          },
          onProgress: (processed, total) => {
            if (options.verbose) {
              logProgress(processed, total, 'Charges processed');
            }
          },
          progressInterval: options.verbose ? 100 : 1000,
          maxItems: options.maxItems,
        });

        hospitalName = parsed.metadata.hospitalName;
        stats.version = parsed.metadata.version;
        stats.totalCharges = parsed.chargeCount;

        hospitalDoc = {
          hospitalId,
          hospitalName: parsed.metadata.hospitalName,
          addresses: parsed.metadata.addresses,
          locations: parsed.metadata.locations,
          npiNumbers: parsed.metadata.npiNumbers,
          licenseNumber: parsed.metadata.licenseNumber,
          licenseState: (parsed.metadata.licenseState || 'CA') as StateCode,
          version: parsed.metadata.version,
          lastUpdatedOn: new Date(parsed.metadata.lastUpdatedOn),
          attestation: {
            text: parsed.metadata.attestationText,
            confirmed: true,
            attesterName: parsed.metadata.attesterName,
          },
          sourceFile: basename(filePath),
          ingestedAt: new Date(),
          chargeCount: parsed.chargeCount,
          modifierCount: 0,
        };
      } else {
        // Standard CMS JSON format
        // Extract hospital name from the already-loaded sample data
        hospitalName = sampleData.hospital_name || 'Unknown Hospital';
        stats.version = sampleData.version || 'unknown';

        const parsed = await streamParseJsonFile(filePath, {
          onCharge: async (charge, index) => {
            stats.processedCharges++;

            // Convert to documents
            const docs = chargeToDocument(
              charge,
              hospitalId,
              hospitalName,
              stats.version
            );

            chargeBatch.push(...docs);

            // Flush batch if needed
            if (chargeBatch.length >= options.batchSize) {
              await flushChargeBatch();
            }
          },
          onModifier: async (modifier, index) => {
            stats.totalModifiers++;

            const modDoc: ModifierDocument = {
              hospitalId,
              code: modifier.code,
              description: modifier.description,
              setting: 'setting' in modifier ? modifier.setting : undefined,
              payerModifications: modifier.modifier_payer_information.map(p => ({
                payerName: p.payer_name,
                planName: p.plan_name,
                description: p.description,
              })),
              ingestedAt: new Date(),
            };

            modifierBatch.push(modDoc);

            if (modifierBatch.length >= options.batchSize) {
              await flushModifierBatch();
            }
          },
          onProgress: (processed, total, bytesRead) => {
            if (options.verbose) {
              logProgress(processed, total, 'Charges processed');
            }
          },
          progressInterval: options.verbose ? 100 : 1000,
          maxItems: options.maxItems,
        });

        hospitalName = parsed.metadata.hospitalName;
        stats.version = parsed.metadata.version;
        stats.totalCharges = parsed.chargeCount;

        // Create hospital document
        hospitalDoc = {
          hospitalId,
          hospitalName: parsed.metadata.hospitalName,
          addresses: parsed.metadata.addresses,
          locations: parsed.metadata.locations,
          npiNumbers: parsed.metadata.npiNumbers,
          licenseNumber: parsed.metadata.licenseNumber,
          licenseState: (parsed.metadata.licenseState || 'CA') as StateCode,
          version: parsed.metadata.version,
          lastUpdatedOn: new Date(parsed.metadata.lastUpdatedOn),
          attestation: {
            text: parsed.metadata.attestation.text,
            confirmed: parsed.metadata.attestation.confirmed,
            attesterName: parsed.metadata.attestation.attesterName,
          },
          financialAidPolicy: parsed.metadata.financialAidPolicy,
          sourceFile: basename(filePath),
          ingestedAt: new Date(),
          chargeCount: parsed.chargeCount,
          modifierCount: parsed.modifierCount,
        };
      }

    } else {
      // CSV format - read hospital name from first row before processing
      const csvFile = Bun.file(filePath);
      const firstChunk = await csvFile.slice(0, 2000).text();
      const firstLine = firstChunk.split(/[\r\n]+/)[1]; // Row 2 has metadata values
      if (firstLine) {
        const values = firstLine.split(',').map(v => v.replace(/^"|"$/g, '').trim());
        hospitalName = values[0] || 'Unknown Hospital';
      }

      const parsed = await parseCSVFile(filePath, {
        onCharge: async (charge, index) => {
          stats.processedCharges++;

          const docs = chargeToDocument(
            charge,
            hospitalId,
            hospitalName,
            stats.version
          );

          chargeBatch.push(...docs);

          if (chargeBatch.length >= options.batchSize) {
            await flushChargeBatch();
          }
        },
        onProgress: (processed, bytesRead) => {
          if (options.verbose) {
            logProgress(processed, null, 'Rows processed');
          }
        },
        progressInterval: options.verbose ? 100 : 1000,
        maxRows: options.maxItems,
      });

      hospitalName = parsed.metadata.hospitalName;
      stats.version = parsed.metadata.version;
      stats.totalCharges = parsed.chargeCount;

      // Create hospital document from CSV metadata
      hospitalDoc = {
        hospitalId,
        hospitalName: parsed.metadata.hospitalName,
        addresses: parsed.metadata.addresses,
        locations: parsed.metadata.locations,
        npiNumbers: parsed.metadata.npiNumbers,
        licenseNumber: parsed.metadata.licenseNumber,
        licenseState: (parsed.metadata.licenseState || 'CA') as StateCode,
        version: parsed.metadata.version,
        lastUpdatedOn: new Date(parsed.metadata.lastUpdatedOn),
        attestation: {
          text: parsed.metadata.attestationText,
          confirmed: true,
          attesterName: parsed.metadata.attesterName,
        },
        sourceFile: basename(filePath),
        ingestedAt: new Date(),
        chargeCount: parsed.chargeCount,
        modifierCount: 0,
      };
    }

    // Flush remaining batches
    await flushChargeBatch();
    await flushModifierBatch();

    if (options.verbose) {
      console.log(); // New line after progress
    }

    // Save hospital document
    if (hospitalDoc && !options.dryRun) {
      await upsertHospital(hospitalDoc);
    }

    stats.status = 'completed';
    stats.endTime = new Date();

    const duration = Date.now() - startTime;
    stats.avgBatchTimeMs = stats.processedCharges > 0
      ? duration / Math.ceil(stats.processedCharges / options.batchSize)
      : 0;

    // Summary
    log(`  ${colors.green}Completed in ${formatDuration(duration)}${colors.reset}`);
    log(`  Hospital: ${hospitalName}`);
    log(`  Charges: ${stats.insertedCharges.toLocaleString()} inserted, ${stats.updatedCharges.toLocaleString()} updated`);

    if (stats.totalModifiers > 0) {
      log(`  Modifiers: ${stats.processedModifiers.toLocaleString()}`);
    }

    if (stats.failedCharges > 0) {
      log(`  ${colors.yellow}Failed: ${stats.failedCharges.toLocaleString()}${colors.reset}`);
    }

  } catch (error) {
    stats.status = 'failed';
    stats.endTime = new Date();

    const err: IngestionError = {
      type: 'unknown',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date(),
    };

    stats.errors.push(err);
    log(`  ${colors.red}Error: ${err.message}${colors.reset}`);
  }

  return stats;
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = parseArgs();

  log(`\n${colors.bright}${colors.cyan}Hospital Price Transparency Ingestion${colors.reset}\n`);

  // Show stats only
  if (args.stats) {
    const stats = await getCollectionStats();
    log('Collection Statistics:');
    log(`  Hospitals: ${stats.hospitals.toLocaleString()}`);
    log(`  Charges: ${stats.charges.toLocaleString()}`);
    log(`  Modifiers: ${stats.modifiers.toLocaleString()}`);
    await closeConnection();
    return;
  }

  // Initialize collections
  if (!args.dryRun) {
    await initializeHospitalPriceCollections();
  }

  if (args.initOnly) {
    log('Collections initialized. Exiting.');
    await closeConnection();
    return;
  }

  // Find files to process
  let files: string[] = [];

  if (args.file) {
    files = [args.file];
  } else {
    files = await findPriceFiles(args.dir);
  }

  if (files.length === 0) {
    log(`No price files found in ${args.dir}`, colors.yellow);
    return;
  }

  log(`Found ${files.length} file(s) to process`);

  if (args.dryRun) {
    log(`${colors.yellow}DRY RUN - no data will be written to database${colors.reset}`);
  }

  // Process each file
  const allStats: IngestionStats[] = [];
  const overallStart = Date.now();

  for (const file of files) {
    const stats = await ingestFile(file, {
      batchSize: args.batchSize,
      dryRun: args.dryRun,
      verbose: args.verbose,
      maxItems: args.maxItems,
      skipExisting: args.skipExisting,
    });

    allStats.push(stats);
  }

  // Overall summary
  const overallDuration = Date.now() - overallStart;
  const totalCharges = allStats.reduce((sum, s) => sum + s.insertedCharges + s.updatedCharges, 0);
  const totalFailed = allStats.reduce((sum, s) => sum + s.failedCharges, 0);
  const successCount = allStats.filter(s => s.status === 'completed').length;

  log(`\n${colors.bright}Summary${colors.reset}`);
  log(`  Files processed: ${successCount}/${files.length}`);
  log(`  Total charges: ${totalCharges.toLocaleString()}`);
  log(`  Total duration: ${formatDuration(overallDuration)}`);
  log(`  Avg throughput: ${Math.round(totalCharges / (overallDuration / 1000)).toLocaleString()} charges/sec`);

  if (totalFailed > 0) {
    log(`  ${colors.yellow}Total failed: ${totalFailed.toLocaleString()}${colors.reset}`);
  }

  // Show final stats
  if (!args.dryRun) {
    const finalStats = await getCollectionStats();
    log(`\nDatabase totals:`);
    log(`  Hospitals: ${finalStats.hospitals.toLocaleString()}`);
    log(`  Charges: ${finalStats.charges.toLocaleString()}`);
    log(`  Modifiers: ${finalStats.modifiers.toLocaleString()}`);
  }

  log('');

  // Close MongoDB connection to allow process to exit
  await closeConnection();
}

// Run
main()
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await closeConnection();
  });
