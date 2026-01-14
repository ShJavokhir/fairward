/**
 * Parser for Lucile Packard Children's Hospital Stanford
 *
 * This hospital uses a non-standard JSON format that combines CSV-like
 * flat structures with JSON. It has payer-specific columns in "wide" format:
 *
 * - `ESTIMATED AMT IP_AETNA PLANS`: "VARIABLE" or numeric (inpatient)
 * - `ESTIMATED AMT_BLUE CROSS PLANS`: null or numeric (outpatient)
 * - Values of "VARIABLE" indicate algorithm-based pricing
 */

import type {
  CodeType,
  DrugMeasurementType,
  Setting,
  Methodology,
  CodeInformation,
  StandardChargeInformationV2,
  StandardChargesV2,
  PayersInformationV2,
  StateCode,
} from '../types/hospital-prices';
import type { CSVHospitalMetadata } from './csv-stream-parser';

export interface LucilePackardParseOptions {
  /** Callback for each parsed charge */
  onCharge?: (charge: StandardChargeInformationV2, index: number) => Promise<void>;

  /** Callback for progress updates */
  onProgress?: (processed: number, total: number) => void;

  /** How often to report progress (in items) */
  progressInterval?: number;

  /** Maximum items to process (for testing) */
  maxItems?: number;
}

export interface LucilePackardParseResult {
  metadata: CSVHospitalMetadata;
  chargeCount: number;
}

/**
 * Detect if a JSON file is in Lucile Packard format
 */
export function isLucilePackardFormat(data: any): boolean {
  return (
    data['HOSPITAL NAME'] !== undefined ||
    (data['VERSION'] === '2' && data.standard_charge_information?.[0]?.['code|1'] !== undefined)
  );
}

/**
 * Parse a number value, handling "VARIABLE" and other non-numeric values
 */
function parsePayerAmount(value: any): number | 'variable' | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim().toUpperCase();
    if (trimmed === 'VARIABLE' || trimmed === '') return 'variable';
    const num = parseFloat(value);
    return isNaN(num) ? undefined : num;
  }
  if (typeof value === 'number') return value;
  return undefined;
}

/**
 * Extract payer name from column key
 * Examples:
 *   "ESTIMATED AMT IP_AETNA PLANS" -> { payer: "AETNA PLANS", setting: "inpatient" }
 *   "ESTIMATED AMT_BLUE CROSS PLANS" -> { payer: "BLUE CROSS PLANS", setting: "outpatient" }
 */
function extractPayerFromKey(key: string): { payerName: string; setting: Setting } | null {
  // Inpatient pattern: ESTIMATED AMT IP_PAYER NAME
  const ipMatch = key.match(/^ESTIMATED AMT IP_(.+)$/);
  if (ipMatch) {
    return { payerName: ipMatch[1], setting: 'inpatient' };
  }

  // Outpatient pattern: ESTIMATED AMT_PAYER NAME (no IP)
  const opMatch = key.match(/^ESTIMATED AMT_(.+)$/);
  if (opMatch && !key.includes(' IP_')) {
    return { payerName: opMatch[1], setting: 'outpatient' };
  }

  return null;
}

/**
 * Parse Lucile Packard's non-standard JSON format
 */
export async function parseLucilePackardFile(
  filePath: string,
  options: LucilePackardParseOptions
): Promise<LucilePackardParseResult> {
  const {
    onCharge,
    onProgress,
    progressInterval = 1000,
    maxItems,
  } = options;

  const file = Bun.file(filePath);
  const data = await file.json();

  // Extract metadata from non-standard header fields
  const metadata: CSVHospitalMetadata = {
    hospitalName: data['HOSPITAL NAME'] || 'Lucile Packard Children\'s Hospital',
    lastUpdatedOn: data['LAST UPDATED ON'] || new Date().toISOString().split('T')[0],
    version: String(data['VERSION'] || '2.2.0'),
    locations: data['LOCATION'] ? [data['LOCATION']] : [],
    addresses: data['HOSPITAL_ADDRESS'] ? [data['HOSPITAL_ADDRESS']] : [],
    npiNumbers: [],
    licenseNumber: data['LICENSE'],
    licenseState: 'CA',
    attestationText: Object.keys(data).find(k => k.includes('To the best of its knowledge')) || '',
    attesterName: data['ATTESTER NAME'],
  };

  const charges = data.standard_charge_information || [];
  const totalCharges = charges.length;
  let processedCount = 0;

  // Discover all payer columns from first item
  const payerColumns: Map<string, { payerName: string; setting: Setting }> = new Map();
  if (charges.length > 0) {
    const sampleItem = charges[0];
    for (const key of Object.keys(sampleItem)) {
      const payerInfo = extractPayerFromKey(key);
      if (payerInfo) {
        payerColumns.set(key, payerInfo);
      }
    }
  }

  // Process each charge item
  for (const item of charges) {
    if (maxItems && processedCount >= maxItems) break;

    // Extract codes
    const codes: CodeInformation[] = [];
    for (let i = 1; i <= 10; i++) {
      const code = item[`code|${i}`];
      const codeType = item[`code|${i}|type`] as CodeType;
      if (code && codeType) {
        codes.push({ code: String(code), type: codeType });
      } else if (code) {
        // Some items have code without type - try to infer or use LOCAL
        codes.push({ code: String(code), type: 'LOCAL' });
      }
    }

    // Get base charge info
    const description = item.description;
    const setting = (item.setting?.toLowerCase() || 'both') as Setting;
    const grossCharge = parsePayerAmount(item['standard_charge|gross']);
    const discountedCash = parsePayerAmount(item['standard_charge|discounted_cash']);
    const algorithm = item['standard_charge|negotiated_algorithm'];

    // Extract min/max for the relevant setting
    const minKey = setting === 'inpatient' ? 'standard_charge IP|min' : 'standard_charge|min';
    const maxKey = setting === 'inpatient' ? 'standard_charge IP|max' : 'standard_charge|max';
    const minValue = parsePayerAmount(item[minKey]);
    const maxValue = parsePayerAmount(item[maxKey]);

    // Collect payer-specific charges
    const payerInfos: PayersInformationV2[] = [];
    let numericMin: number | undefined;
    let numericMax: number | undefined;

    for (const [columnKey, { payerName, setting: payerSetting }] of payerColumns) {
      // Only include payers that match the item's setting
      if (setting !== 'both' && payerSetting !== setting) continue;

      const amount = parsePayerAmount(item[columnKey]);
      if (amount === undefined) continue;

      if (amount === 'variable') {
        // Algorithm-based pricing
        const payerInfo: PayersInformationV2 = {
          payer_name: payerName,
          plan_name: payerName, // Use payer name as plan since this format doesn't distinguish
          methodology: 'other',
          standard_charge_algorithm: algorithm || 'Algorithm-based pricing',
        };
        payerInfos.push(payerInfo);
      } else {
        // Fixed dollar amount
        const payerInfo: PayersInformationV2 = {
          payer_name: payerName,
          plan_name: payerName,
          methodology: 'other',
          estimated_amount: amount,
        };
        payerInfos.push(payerInfo);

        // Track min/max from actual payer amounts
        if (numericMin === undefined || amount < numericMin) numericMin = amount;
        if (numericMax === undefined || amount > numericMax) numericMax = amount;
      }
    }

    // Build the standard charge info
    const standardCharge: StandardChargesV2 = {
      setting,
      gross_charge: typeof grossCharge === 'number' ? grossCharge : undefined,
      discounted_cash: typeof discountedCash === 'number' ? discountedCash : undefined,
      minimum: typeof minValue === 'number' ? minValue : numericMin,
      maximum: typeof maxValue === 'number' ? maxValue : numericMax,
      payers_information: payerInfos.length > 0 ? payerInfos : undefined,
      additional_generic_notes: algorithm,
    };

    const chargeInfo: StandardChargeInformationV2 = {
      description,
      code_information: codes,
      standard_charges: [standardCharge],
    };

    // Drug info if present
    const drugUnit = parsePayerAmount(item.drug_unit_of_measurement);
    const drugType = item.drug_type_of_measurement as DrugMeasurementType;
    if (typeof drugUnit === 'number' && drugType) {
      chargeInfo.drug_information = { unit: drugUnit, type: drugType };
    }

    if (onCharge) {
      await onCharge(chargeInfo, processedCount);
    }

    processedCount++;

    if (onProgress && processedCount % progressInterval === 0) {
      onProgress(processedCount, totalCharges);
    }
  }

  return {
    metadata,
    chargeCount: processedCount,
  };
}
