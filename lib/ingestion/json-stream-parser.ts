/**
 * Streaming JSON Parser for Hospital Price Transparency Files
 *
 * Efficiently parses large JSON MRF files using incremental parsing.
 * Handles files that are too large to fit in memory.
 *
 * Strategy:
 * 1. For smaller files (<50MB): Parse entire file
 * 2. For larger files: Stream and parse incrementally using state machine
 */

import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import type {
  HospitalMRF,
  HospitalMRFV2,
  HospitalMRFV3,
  StandardChargeInformationV2,
  StandardChargeInformationV3,
  ModifierInformationV2,
  ModifierInformationV3,
  SchemaVersion,
  FileMetadata,
} from '../types/hospital-prices';

// Threshold for switching to streaming mode
const STREAMING_THRESHOLD_BYTES = 50 * 1024 * 1024; // 50MB

export interface ParsedHospitalData {
  metadata: {
    hospitalName: string;
    addresses: string[];
    locations: string[];
    npiNumbers: string[];
    licenseNumber?: string;
    licenseState: string;
    version: string;
    lastUpdatedOn: string;
    attestation: {
      text: string;
      confirmed: boolean;
      attesterName?: string;
    };
    financialAidPolicy?: string[];
  };
  chargeCount: number;
  modifierCount: number;
}

export interface StreamingParserOptions {
  /** Callback for each standard_charge_information item */
  onCharge?: (charge: StandardChargeInformationV2 | StandardChargeInformationV3, index: number) => Promise<void>;

  /** Callback for each modifier_information item */
  onModifier?: (modifier: ModifierInformationV2 | ModifierInformationV3, index: number) => Promise<void>;

  /** Callback for progress updates */
  onProgress?: (processed: number, total: number | null, bytesRead: number) => void;

  /** How often to report progress (in items) */
  progressInterval?: number;

  /** Maximum items to process (for testing) */
  maxItems?: number;
}

/**
 * Detect file metadata without fully parsing
 */
export async function detectFileMetadata(filePath: string): Promise<FileMetadata> {
  const stats = await stat(filePath);
  const isJson = filePath.toLowerCase().endsWith('.json');

  if (!isJson) {
    return {
      path: filePath,
      format: filePath.includes('tall') ? 'csv-tall' : 'csv-wide',
      version: 'unknown',
      sizeBytes: stats.size,
    };
  }

  // Read first 2KB to detect version
  const file = Bun.file(filePath);
  const chunk = await file.slice(0, 2048).text();

  let version: SchemaVersion = 'unknown';
  const versionMatch = chunk.match(/"version"\s*:\s*"([^"]+)"/);
  if (versionMatch) {
    const v = versionMatch[1];
    if (v.startsWith('3.')) version = '3.0.0';
    else if (v.startsWith('2.')) version = '2.2.0';
  }

  // Estimate record count based on occurrences
  const fullSample = await file.slice(0, Math.min(stats.size, 1024 * 1024)).text();
  const sampleMatches = (fullSample.match(/"description"\s*:/g) || []).length;
  const estimatedRecords = sampleMatches > 0
    ? Math.round((sampleMatches / Math.min(stats.size, 1024 * 1024)) * stats.size)
    : undefined;

  return {
    path: filePath,
    format: 'json',
    version,
    sizeBytes: stats.size,
    estimatedRecords,
  };
}

/**
 * Parse entire JSON file (for smaller files)
 */
export async function parseJsonFile(filePath: string): Promise<HospitalMRF> {
  const file = Bun.file(filePath);
  const content = await file.json();
  return content as HospitalMRF;
}

/**
 * Stream parse a large JSON file with callbacks for each item
 */
export async function streamParseJsonFile(
  filePath: string,
  options: StreamingParserOptions
): Promise<ParsedHospitalData> {
  const {
    onCharge,
    onModifier,
    onProgress,
    progressInterval = 1000,
    maxItems,
  } = options;

  const fileInfo = await detectFileMetadata(filePath);

  // For smaller files, just parse and iterate
  if (fileInfo.sizeBytes < STREAMING_THRESHOLD_BYTES) {
    return parseAndIterateSmallFile(filePath, options);
  }

  // For large files, use true streaming
  return parseAndIterateLargeFile(filePath, options);
}

/**
 * Parse smaller files by loading into memory and iterating
 */
async function parseAndIterateSmallFile(
  filePath: string,
  options: StreamingParserOptions
): Promise<ParsedHospitalData> {
  const {
    onCharge,
    onModifier,
    onProgress,
    progressInterval = 1000,
    maxItems,
  } = options;

  const mrf = await parseJsonFile(filePath);
  const stats = await stat(filePath);

  const metadata = extractMetadata(mrf);
  let chargeIndex = 0;
  let modifierIndex = 0;

  // Process charges
  if (onCharge && mrf.standard_charge_information) {
    const total = mrf.standard_charge_information.length;

    for (const charge of mrf.standard_charge_information) {
      if (maxItems && chargeIndex >= maxItems) break;

      await onCharge(charge, chargeIndex);
      chargeIndex++;

      if (onProgress && chargeIndex % progressInterval === 0) {
        onProgress(chargeIndex, total, stats.size);
      }
    }
  }

  // Process modifiers
  if (onModifier && mrf.modifier_information) {
    for (const modifier of mrf.modifier_information) {
      await onModifier(modifier, modifierIndex);
      modifierIndex++;
    }
  }

  return {
    metadata,
    chargeCount: chargeIndex,
    modifierCount: modifierIndex,
  };
}

/**
 * Stream parse large files using incremental JSON parsing
 *
 * This uses a custom state machine to parse JSON incrementally,
 * focusing on extracting standard_charge_information items one at a time.
 */
async function parseAndIterateLargeFile(
  filePath: string,
  options: StreamingParserOptions
): Promise<ParsedHospitalData> {
  const {
    onCharge,
    onModifier,
    onProgress,
    progressInterval = 1000,
    maxItems,
  } = options;

  const stats = await stat(filePath);
  const totalBytes = stats.size;

  // For very large files, we use a chunked approach
  // First, read the header to get metadata
  const file = Bun.file(filePath);
  const headerChunk = await file.slice(0, Math.min(totalBytes, 10 * 1024)).text();

  // Extract metadata from header
  const partialMetadata = extractPartialMetadata(headerChunk);

  // Now stream and parse standard_charge_information array
  let chargeIndex = 0;
  let modifierIndex = 0;
  let bytesRead = 0;

  // Use Bun's streaming capabilities
  const stream = file.stream();
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  let buffer = '';
  let inChargesArray = false;
  let inModifiersArray = false;
  let braceDepth = 0;
  let itemStart = -1;
  let foundChargesKey = false;
  let foundModifiersKey = false;

  const processBuffer = async () => {
    // State machine to find and extract items from standard_charge_information array
    let i = 0;

    while (i < buffer.length) {
      const char = buffer[i];

      // Track if we found the key
      if (!inChargesArray && !foundChargesKey) {
        const keyMatch = buffer.indexOf('"standard_charge_information"', i);
        if (keyMatch !== -1 && keyMatch < i + 100) {
          foundChargesKey = true;
          i = keyMatch + '"standard_charge_information"'.length;
          continue;
        }
      }

      // Look for start of array after key
      if (foundChargesKey && !inChargesArray && char === '[') {
        inChargesArray = true;
        braceDepth = 0;
        i++;
        continue;
      }

      if (inChargesArray) {
        // Track object depth
        if (char === '{') {
          if (braceDepth === 0) {
            itemStart = i;
          }
          braceDepth++;
        } else if (char === '}') {
          braceDepth--;

          if (braceDepth === 0 && itemStart !== -1) {
            // Extract complete item
            const itemJson = buffer.slice(itemStart, i + 1);
            itemStart = -1;

            try {
              const item = JSON.parse(itemJson);

              if (onCharge) {
                await onCharge(item, chargeIndex);
              }

              chargeIndex++;

              if (onProgress && chargeIndex % progressInterval === 0) {
                onProgress(chargeIndex, null, bytesRead);
              }

              if (maxItems && chargeIndex >= maxItems) {
                return true; // Signal to stop
              }
            } catch {
              // Invalid JSON, skip
              console.error(`Failed to parse item at index ${chargeIndex}`);
            }
          }
        } else if (char === ']' && braceDepth === 0) {
          // End of array
          inChargesArray = false;
          foundChargesKey = false;
        }
      }

      // Similar logic for modifier_information
      if (!inModifiersArray && !foundModifiersKey && !inChargesArray) {
        const keyMatch = buffer.indexOf('"modifier_information"', i);
        if (keyMatch !== -1 && keyMatch < i + 100) {
          foundModifiersKey = true;
          i = keyMatch + '"modifier_information"'.length;
          continue;
        }
      }

      if (foundModifiersKey && !inModifiersArray && char === '[') {
        inModifiersArray = true;
        braceDepth = 0;
        i++;
        continue;
      }

      if (inModifiersArray) {
        if (char === '{') {
          if (braceDepth === 0) {
            itemStart = i;
          }
          braceDepth++;
        } else if (char === '}') {
          braceDepth--;

          if (braceDepth === 0 && itemStart !== -1) {
            const itemJson = buffer.slice(itemStart, i + 1);
            itemStart = -1;

            try {
              const item = JSON.parse(itemJson);

              if (onModifier) {
                await onModifier(item, modifierIndex);
              }

              modifierIndex++;
            } catch {
              console.error(`Failed to parse modifier at index ${modifierIndex}`);
            }
          }
        } else if (char === ']' && braceDepth === 0) {
          inModifiersArray = false;
          foundModifiersKey = false;
        }
      }

      i++;
    }

    // Keep unprocessed part of buffer (last incomplete item)
    if (itemStart !== -1) {
      buffer = buffer.slice(itemStart);
      itemStart = 0;
    } else if (inChargesArray || inModifiersArray) {
      // Keep some context for finding items
      buffer = buffer.slice(Math.max(0, buffer.length - 10000));
    } else {
      buffer = buffer.slice(Math.max(0, buffer.length - 1000));
    }

    return false;
  };

  // Read and process chunks
  let done = false;
  while (!done) {
    const result = await reader.read();

    if (result.done) {
      done = true;
      // Process remaining buffer
      await processBuffer();
      break;
    }

    buffer += decoder.decode(result.value, { stream: true });
    bytesRead += result.value.length;

    // Process buffer when it gets large enough
    if (buffer.length > 100000) {
      const shouldStop = await processBuffer();
      if (shouldStop) break;
    }
  }

  reader.releaseLock();

  return {
    metadata: {
      hospitalName: partialMetadata.hospitalName || 'Unknown',
      addresses: partialMetadata.addresses || [],
      locations: partialMetadata.locations || [],
      npiNumbers: partialMetadata.npiNumbers || [],
      licenseNumber: partialMetadata.licenseNumber,
      licenseState: partialMetadata.licenseState || 'CA',
      version: partialMetadata.version || 'unknown',
      lastUpdatedOn: partialMetadata.lastUpdatedOn || new Date().toISOString(),
      attestation: {
        text: partialMetadata.attestationText || '',
        confirmed: partialMetadata.attestationConfirmed || false,
        attesterName: partialMetadata.attesterName,
      },
      financialAidPolicy: partialMetadata.financialAidPolicy,
    },
    chargeCount: chargeIndex,
    modifierCount: modifierIndex,
  };
}

/**
 * Extract metadata from a fully parsed MRF
 */
function extractMetadata(mrf: HospitalMRF): ParsedHospitalData['metadata'] {
  const isV3 = 'attestation' in mrf && 'location_name' in mrf;

  if (isV3) {
    const v3 = mrf as HospitalMRFV3;
    return {
      hospitalName: v3.hospital_name,
      addresses: Array.isArray(v3.hospital_address) ? v3.hospital_address : [v3.hospital_address],
      locations: v3.location_name,
      npiNumbers: v3.type_2_npi,
      licenseNumber: v3.license_information?.license_number,
      licenseState: v3.license_information?.state || 'CA',
      version: v3.version,
      lastUpdatedOn: v3.last_updated_on,
      attestation: {
        text: v3.attestation.attestation,
        confirmed: v3.attestation.confirm_attestation,
        attesterName: v3.attestation.attester_name,
      },
    };
  }

  const v2 = mrf as HospitalMRFV2;
  return {
    hospitalName: v2.hospital_name,
    addresses: Array.isArray(v2.hospital_address) ? v2.hospital_address : [v2.hospital_address],
    locations: v2.hospital_location || [],
    npiNumbers: [],
    licenseNumber: v2.license_information?.license_number,
    licenseState: v2.license_information?.state || 'CA',
    version: v2.version,
    lastUpdatedOn: v2.last_updated_on,
    attestation: {
      text: v2.affirmation?.affirmation || '',
      confirmed: v2.affirmation?.confirm_affirmation || false,
    },
    financialAidPolicy: v2.financial_aid_policy,
  };
}

/**
 * Extract partial metadata from a JSON chunk (for streaming large files)
 */
function extractPartialMetadata(chunk: string): {
  hospitalName?: string;
  addresses?: string[];
  locations?: string[];
  npiNumbers?: string[];
  licenseNumber?: string;
  licenseState?: string;
  version?: string;
  lastUpdatedOn?: string;
  attestationText?: string;
  attestationConfirmed?: boolean;
  attesterName?: string;
  financialAidPolicy?: string[];
} {
  const result: ReturnType<typeof extractPartialMetadata> = {};

  // Hospital name
  const nameMatch = chunk.match(/"hospital_name"\s*:\s*"([^"]+)"/);
  if (nameMatch) result.hospitalName = nameMatch[1];

  // Version
  const versionMatch = chunk.match(/"version"\s*:\s*"([^"]+)"/);
  if (versionMatch) result.version = versionMatch[1];

  // Last updated
  const dateMatch = chunk.match(/"last_updated_on"\s*:\s*"([^"]+)"/);
  if (dateMatch) result.lastUpdatedOn = dateMatch[1];

  // License state
  const stateMatch = chunk.match(/"state"\s*:\s*"([A-Z]{2})"/);
  if (stateMatch) result.licenseState = stateMatch[1];

  // License number
  const licenseMatch = chunk.match(/"license_number"\s*:\s*"([^"]+)"/);
  if (licenseMatch) result.licenseNumber = licenseMatch[1];

  return result;
}

/**
 * Validate a standard charge information item
 */
export function validateChargeItem(
  item: StandardChargeInformationV2 | StandardChargeInformationV3
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!item.description || item.description.trim().length === 0) {
    errors.push('Missing description');
  }

  if (!item.code_information || item.code_information.length === 0) {
    errors.push('Missing code information');
  } else {
    for (const code of item.code_information) {
      if (!code.code || !code.type) {
        errors.push(`Invalid code entry: ${JSON.stringify(code)}`);
      }
    }
  }

  if (!item.standard_charges || item.standard_charges.length === 0) {
    errors.push('Missing standard charges');
  } else {
    for (const charge of item.standard_charges) {
      if (!charge.setting) {
        errors.push('Missing setting in charge');
      }

      // At least one charge type required
      const hasCharge =
        charge.gross_charge ||
        charge.discounted_cash ||
        (charge.payers_information && charge.payers_information.length > 0);

      if (!hasCharge) {
        errors.push('No charge value provided');
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
