/**
 * Streaming CSV Parser for Hospital Price Transparency Files
 *
 * Supports both Tall and Wide CSV formats as defined by CMS.
 * Uses streaming to handle large files efficiently.
 *
 * CSV Structure:
 * - Row 1: General data element headers with values
 * - Row 2: General data element values (version, etc.)
 * - Row 3: Standard charge data headers
 * - Row 4+: Standard charge data
 */

import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import type {
  CodeType,
  DrugMeasurementType,
  Setting,
  Methodology,
  CodeInformation,
  StandardChargeInformationV2,
  StandardChargeInformationV3,
  StandardChargesV2,
  StandardChargesV3,
  PayersInformationV2,
  PayersInformationV3,
  FileMetadata,
  SchemaVersion,
} from '../types/hospital-prices';

export interface CSVHospitalMetadata {
  hospitalName: string;
  lastUpdatedOn: string;
  version: string;
  locations: string[];
  addresses: string[];
  npiNumbers: string[];
  licenseNumber?: string;
  licenseState?: string;
  attestationText: string;
  attesterName?: string;
  generalContractProvisions?: string;
}

export interface CSVParserOptions {
  /** Callback for each parsed charge row */
  onCharge?: (charge: StandardChargeInformationV2 | StandardChargeInformationV3, index: number) => Promise<void>;

  /** Callback for progress updates */
  onProgress?: (processed: number, bytesRead: number) => void;

  /** How often to report progress (in rows) */
  progressInterval?: number;

  /** Maximum rows to process (for testing) */
  maxRows?: number;
}

export interface CSVParseResult {
  metadata: CSVHospitalMetadata;
  chargeCount: number;
  format: 'tall' | 'wide';
}

/**
 * Detect CSV format (tall vs wide) by examining headers
 */
export async function detectCSVFormat(filePath: string): Promise<'tall' | 'wide' | 'unknown'> {
  const file = Bun.file(filePath);
  const sample = await file.slice(0, 10000).text();
  const lines = sample.split('\n');

  if (lines.length < 3) return 'unknown';

  // Row 3 contains the data headers
  const headerRow = lines[2]?.toLowerCase() || '';

  // Tall format has single payer_name column
  // Wide format has payer-specific columns like "standard_charge|negotiated_dollar|[payer]|[plan]"
  if (headerRow.includes('payer_name') && !headerRow.includes('|payer')) {
    return 'tall';
  }

  if (headerRow.includes('|payer') || headerRow.includes('| payer')) {
    return 'wide';
  }

  // Check for wide format column patterns
  const widePattern = /standard_charge\|.*\|.*\|/;
  if (widePattern.test(headerRow)) {
    return 'wide';
  }

  return 'tall'; // Default to tall
}

/**
 * Parse CSV value, handling quoted strings and escapes
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
    i++;
  }

  values.push(current.trim());
  return values;
}

/**
 * Parse numeric value from CSV, returning undefined for empty/invalid
 */
function parseNumber(value: string | undefined): number | undefined {
  if (!value || value.trim() === '') return undefined;
  const num = parseFloat(value);
  return isNaN(num) ? undefined : num;
}

/**
 * Extract general metadata from CSV rows 1-2
 */
function parseCSVMetadata(headerRow: string[], valueRow: string[]): CSVHospitalMetadata {
  const getValue = (searchTerms: string[]): string | undefined => {
    for (const term of searchTerms) {
      const idx = headerRow.findIndex(h =>
        h.toLowerCase().includes(term.toLowerCase())
      );
      if (idx !== -1 && valueRow[idx]) {
        return valueRow[idx];
      }
    }
    return undefined;
  };

  // Parse pipe-delimited values into arrays
  const parseList = (value: string | undefined): string[] => {
    if (!value) return [];
    return value.split('|').map(v => v.trim()).filter(v => v.length > 0);
  };

  // Find attestation text (it's usually the longest header that starts with "To the best")
  const attestationHeader = headerRow.find(h =>
    h.toLowerCase().includes('to the best of its knowledge')
  );

  return {
    hospitalName: getValue(['hospital_name']) || 'Unknown Hospital',
    lastUpdatedOn: getValue(['last_updated_on']) || new Date().toISOString().split('T')[0],
    version: getValue(['version']) || 'unknown',
    locations: parseList(getValue(['location_name', 'hospital_location'])),
    addresses: parseList(getValue(['hospital_address'])),
    npiNumbers: parseList(getValue(['type_2_npi'])),
    licenseNumber: getValue(['license_number']),
    licenseState: getValue(['state', 'license_number|']),
    attestationText: attestationHeader || '',
    attesterName: getValue(['attester_name']),
    generalContractProvisions: getValue(['general_contract_provisions']),
  };
}

/**
 * Stream parse a CSV file in tall format
 */
export async function parseCSVTallFormat(
  filePath: string,
  options: CSVParserOptions
): Promise<CSVParseResult> {
  const {
    onCharge,
    onProgress,
    progressInterval = 1000,
    maxRows,
  } = options;

  const file = Bun.file(filePath);
  const content = await file.text();
  const lines = content.split('\n');

  if (lines.length < 4) {
    throw new Error('Invalid CSV: Less than 4 rows');
  }

  // Parse header rows
  const generalHeaders = parseCSVLine(lines[0]);
  const generalValues = parseCSVLine(lines[1]);
  const dataHeaders = parseCSVLine(lines[2]);

  const metadata = parseCSVMetadata(generalHeaders, generalValues);

  // Map data headers to indices
  const headerIndex: Record<string, number> = {};
  dataHeaders.forEach((h, i) => {
    headerIndex[h.toLowerCase().replace(/\s+/g, '')] = i;
  });

  // Helper to get value by header name
  const getVal = (row: string[], ...keys: string[]): string | undefined => {
    for (const key of keys) {
      const idx = headerIndex[key.toLowerCase().replace(/\s+/g, '')];
      if (idx !== undefined && row[idx]) {
        return row[idx];
      }
    }
    return undefined;
  };

  let chargeCount = 0;
  let currentChargeGroup: Map<string, {
    description: string;
    codes: CodeInformation[];
    drugUnit?: number;
    drugType?: DrugMeasurementType;
    settings: Map<Setting, {
      grossCharge?: number;
      discountedCash?: number;
      min?: number;
      max?: number;
      payers: Array<PayersInformationV2 | PayersInformationV3>;
      notes?: string;
    }>;
  }> = new Map();

  // Process data rows (starting from row 4, index 3)
  for (let i = 3; i < lines.length; i++) {
    if (maxRows && chargeCount >= maxRows) break;

    const line = lines[i].trim();
    if (!line) continue;

    const row = parseCSVLine(line);
    const description = getVal(row, 'description');

    if (!description) continue;

    // Extract codes - handle multiple code columns
    const codes: CodeInformation[] = [];
    for (let codeIdx = 1; codeIdx <= 10; codeIdx++) {
      const codeKey = codeIdx === 1 ? 'code|[i]' : `code|[${codeIdx}]`;
      const typeKey = codeIdx === 1 ? 'code|[i]|type' : `code|[${codeIdx}]|type`;

      const code = getVal(row, codeKey, `code|${codeIdx}`, 'code');
      const type = getVal(row, typeKey, `code|${codeIdx}|type`, 'code|type') as CodeType | undefined;

      if (code && type) {
        codes.push({ code, type });
      }
    }

    // Also try single code column
    if (codes.length === 0) {
      const singleCode = getVal(row, 'code');
      const singleType = getVal(row, 'code|type', 'code_type') as CodeType | undefined;
      if (singleCode && singleType) {
        codes.push({ code: singleCode, type: singleType });
      }
    }

    const setting = (getVal(row, 'setting') || 'both') as Setting;
    const payerName = getVal(row, 'payer_name');
    const planName = getVal(row, 'plan_name');

    // Build charge info
    const grossCharge = parseNumber(getVal(row, 'standard_charge|gross'));
    const discountedCash = parseNumber(getVal(row, 'standard_charge|discounted_cash'));
    const negotiatedDollar = parseNumber(getVal(row, 'standard_charge|negotiated_dollar'));
    const negotiatedPercentage = parseNumber(getVal(row, 'standard_charge|negotiated_percentage'));
    const negotiatedAlgorithm = getVal(row, 'standard_charge|negotiated_algorithm');
    const methodology = getVal(row, 'standard_charge|methodology') as Methodology | undefined;
    const min = parseNumber(getVal(row, 'standard_charge|min'));
    const max = parseNumber(getVal(row, 'standard_charge|max'));
    const notes = getVal(row, 'additional_generic_notes');

    // v3.0 fields
    const medianAmount = parseNumber(getVal(row, 'median_amount'));
    const percentile10 = parseNumber(getVal(row, '10th_percentile'));
    const percentile90 = parseNumber(getVal(row, '90th_percentile'));
    const count = getVal(row, 'count');

    // v2.x field
    const estimatedAmount = parseNumber(getVal(row, 'estimated_amount'));

    // Drug info
    const drugUnit = parseNumber(getVal(row, 'drug_unit_of_measurement'));
    const drugType = getVal(row, 'drug_type_of_measurement') as DrugMeasurementType | undefined;

    // Create unique key for grouping
    const chargeKey = `${description}|${codes.map(c => `${c.code}:${c.type}`).join(',')}`;

    // Get or create charge group
    if (!currentChargeGroup.has(chargeKey)) {
      // If there's an existing group, flush it
      if (currentChargeGroup.size > 0 && onCharge) {
        for (const group of currentChargeGroup.values()) {
          const chargeInfo = buildChargeInfoFromGroup(group, metadata.version);
          await onCharge(chargeInfo, chargeCount);
          chargeCount++;

          if (onProgress && chargeCount % progressInterval === 0) {
            onProgress(chargeCount, i * 100);  // Approximate bytes
          }
        }
        currentChargeGroup.clear();
      }

      currentChargeGroup.set(chargeKey, {
        description,
        codes,
        drugUnit,
        drugType,
        settings: new Map(),
      });
    }

    const group = currentChargeGroup.get(chargeKey)!;

    // Get or create setting
    if (!group.settings.has(setting)) {
      group.settings.set(setting, {
        grossCharge,
        discountedCash,
        min,
        max,
        payers: [],
        notes,
      });
    }

    const settingData = group.settings.get(setting)!;

    // Update charge values
    if (grossCharge && !settingData.grossCharge) settingData.grossCharge = grossCharge;
    if (discountedCash && !settingData.discountedCash) settingData.discountedCash = discountedCash;
    if (min && (!settingData.min || min < settingData.min)) settingData.min = min;
    if (max && (!settingData.max || max > settingData.max)) settingData.max = max;
    if (notes && !settingData.notes) settingData.notes = notes;

    // Add payer info if present
    if (payerName && planName) {
      const isV3 = metadata.version.startsWith('3.');

      if (isV3) {
        const payerInfo: PayersInformationV3 = {
          payer_name: payerName,
          plan_name: planName,
          methodology,
        };
        if (negotiatedDollar) payerInfo.standard_charge_dollar = negotiatedDollar;
        if (negotiatedPercentage) payerInfo.standard_charge_percentage = negotiatedPercentage;
        if (negotiatedAlgorithm) payerInfo.standard_charge_algorithm = negotiatedAlgorithm;
        if (medianAmount) payerInfo.median_amount = medianAmount;
        if (percentile10) payerInfo['10th_percentile'] = percentile10;
        if (percentile90) payerInfo['90th_percentile'] = percentile90;
        if (count) payerInfo.count = count;

        settingData.payers.push(payerInfo);
      } else {
        const payerInfo: PayersInformationV2 = {
          payer_name: payerName,
          plan_name: planName,
          methodology,
        };
        if (negotiatedDollar) payerInfo.standard_charge_dollar = negotiatedDollar;
        if (negotiatedPercentage) payerInfo.standard_charge_percentage = negotiatedPercentage;
        if (negotiatedAlgorithm) payerInfo.standard_charge_algorithm = negotiatedAlgorithm;
        if (estimatedAmount) payerInfo.estimated_amount = estimatedAmount;

        settingData.payers.push(payerInfo);
      }
    }
  }

  // Flush remaining groups
  if (onCharge) {
    for (const group of currentChargeGroup.values()) {
      const chargeInfo = buildChargeInfoFromGroup(group, metadata.version);
      await onCharge(chargeInfo, chargeCount);
      chargeCount++;
    }
  }

  return {
    metadata,
    chargeCount,
    format: 'tall',
  };
}

/**
 * Build StandardChargeInformation from accumulated group data
 */
function buildChargeInfoFromGroup(
  group: {
    description: string;
    codes: CodeInformation[];
    drugUnit?: number;
    drugType?: DrugMeasurementType;
    settings: Map<Setting, {
      grossCharge?: number;
      discountedCash?: number;
      min?: number;
      max?: number;
      payers: Array<PayersInformationV2 | PayersInformationV3>;
      notes?: string;
    }>;
  },
  version: string
): StandardChargeInformationV2 | StandardChargeInformationV3 {
  const standardCharges: Array<StandardChargesV2 | StandardChargesV3> = [];

  for (const [setting, data] of group.settings) {
    const charge: StandardChargesV2 | StandardChargesV3 = {
      setting,
      gross_charge: data.grossCharge,
      discounted_cash: data.discountedCash,
      minimum: data.min,
      maximum: data.max,
      additional_generic_notes: data.notes,
      payers_information: data.payers.length > 0 ? data.payers : undefined,
    };

    standardCharges.push(charge);
  }

  const result: StandardChargeInformationV2 | StandardChargeInformationV3 = {
    description: group.description,
    code_information: group.codes,
    standard_charges: standardCharges as any,
  };

  if (group.drugUnit && group.drugType) {
    result.drug_information = {
      unit: group.drugUnit,
      type: group.drugType,
    };
  }

  return result;
}

/**
 * Stream parse a CSV file (auto-detects format)
 */
export async function parseCSVFile(
  filePath: string,
  options: CSVParserOptions
): Promise<CSVParseResult> {
  const format = await detectCSVFormat(filePath);

  if (format === 'wide') {
    // Wide format parsing is more complex - convert to tall internally
    return parseCSVWideFormat(filePath, options);
  }

  return parseCSVTallFormat(filePath, options);
}

/**
 * Parse CSV wide format
 * Wide format has columns like:
 * standard_charge|negotiated_dollar|[payer_name]|[plan_name]
 */
export async function parseCSVWideFormat(
  filePath: string,
  options: CSVParserOptions
): Promise<CSVParseResult> {
  const {
    onCharge,
    onProgress,
    progressInterval = 1000,
    maxRows,
  } = options;

  const file = Bun.file(filePath);
  const content = await file.text();
  const lines = content.split('\n');

  if (lines.length < 4) {
    throw new Error('Invalid CSV: Less than 4 rows');
  }

  // Parse header rows
  const generalHeaders = parseCSVLine(lines[0]);
  const generalValues = parseCSVLine(lines[1]);
  const dataHeaders = parseCSVLine(lines[2]);

  const metadata = parseCSVMetadata(generalHeaders, generalValues);

  // Parse payer columns from headers
  // Format: field|payer_name|plan_name
  interface PayerColumn {
    field: 'negotiated_dollar' | 'negotiated_percentage' | 'negotiated_algorithm' |
           'methodology' | 'estimated_amount' | 'median_amount' |
           '10th_percentile' | '90th_percentile' | 'count';
    payerName: string;
    planName: string;
    index: number;
  }

  const payerColumns: PayerColumn[] = [];
  const payerKey = (payer: string, plan: string) => `${payer}|${plan}`;

  dataHeaders.forEach((header, index) => {
    const parts = header.split('|').map(p => p.trim());

    if (parts.length >= 3) {
      const fieldPart = parts[0].toLowerCase();
      const payerName = parts[parts.length - 2];
      const planName = parts[parts.length - 1];

      // Determine field type
      let field: PayerColumn['field'] | null = null;

      if (fieldPart.includes('negotiated_dollar') || fieldPart.includes('dollar')) {
        field = 'negotiated_dollar';
      } else if (fieldPart.includes('negotiated_percentage') || fieldPart.includes('percentage')) {
        field = 'negotiated_percentage';
      } else if (fieldPart.includes('negotiated_algorithm') || fieldPart.includes('algorithm')) {
        field = 'negotiated_algorithm';
      } else if (fieldPart.includes('methodology')) {
        field = 'methodology';
      } else if (fieldPart.includes('estimated_amount')) {
        field = 'estimated_amount';
      } else if (fieldPart.includes('median_amount')) {
        field = 'median_amount';
      } else if (fieldPart.includes('10th_percentile')) {
        field = '10th_percentile';
      } else if (fieldPart.includes('90th_percentile')) {
        field = '90th_percentile';
      } else if (fieldPart.includes('count') && !fieldPart.includes('discount')) {
        field = 'count';
      }

      if (field && payerName && planName) {
        payerColumns.push({ field, payerName, planName, index });
      }
    }
  });

  // Create header index for non-payer columns
  const headerIndex: Record<string, number> = {};
  dataHeaders.forEach((h, i) => {
    const key = h.toLowerCase().replace(/\s+/g, '').split('|')[0];
    if (!headerIndex[key]) {
      headerIndex[key] = i;
    }
  });

  const getVal = (row: string[], key: string): string | undefined => {
    const idx = headerIndex[key.toLowerCase().replace(/\s+/g, '')];
    return idx !== undefined ? row[idx] : undefined;
  };

  let chargeCount = 0;

  // Process data rows
  for (let i = 3; i < lines.length; i++) {
    if (maxRows && chargeCount >= maxRows) break;

    const line = lines[i].trim();
    if (!line) continue;

    const row = parseCSVLine(line);
    const description = getVal(row, 'description');

    if (!description) continue;

    // Extract codes
    const codes: CodeInformation[] = [];
    for (let codeIdx = 1; codeIdx <= 10; codeIdx++) {
      const code = row[headerIndex[`code|[${codeIdx}]`] ?? headerIndex['code|[i]'] ?? -1];
      const type = row[headerIndex[`code|[${codeIdx}]|type`] ?? headerIndex['code|[i]|type'] ?? -1] as CodeType;

      if (code && type) {
        codes.push({ code, type });
        break; // For wide format, usually just one code per row
      }
    }

    const setting = (getVal(row, 'setting') || 'both') as Setting;
    const grossCharge = parseNumber(getVal(row, 'standard_charge|gross'));
    const discountedCash = parseNumber(getVal(row, 'standard_charge|discounted_cash'));
    const min = parseNumber(getVal(row, 'standard_charge|min'));
    const max = parseNumber(getVal(row, 'standard_charge|max'));
    const notes = getVal(row, 'additional_generic_notes');

    // Drug info
    const drugUnit = parseNumber(getVal(row, 'drug_unit_of_measurement'));
    const drugType = getVal(row, 'drug_type_of_measurement') as DrugMeasurementType | undefined;

    // Collect payer-specific data
    const payerData: Map<string, PayersInformationV2 | PayersInformationV3> = new Map();

    for (const col of payerColumns) {
      const key = payerKey(col.payerName, col.planName);
      const value = row[col.index];

      if (!value || value.trim() === '') continue;

      if (!payerData.has(key)) {
        payerData.set(key, {
          payer_name: col.payerName,
          plan_name: col.planName,
        } as PayersInformationV2 | PayersInformationV3);
      }

      const payer = payerData.get(key)!;

      switch (col.field) {
        case 'negotiated_dollar':
          payer.standard_charge_dollar = parseNumber(value);
          break;
        case 'negotiated_percentage':
          payer.standard_charge_percentage = parseNumber(value);
          break;
        case 'negotiated_algorithm':
          payer.standard_charge_algorithm = value;
          break;
        case 'methodology':
          payer.methodology = value as Methodology;
          break;
        case 'estimated_amount':
          (payer as PayersInformationV2).estimated_amount = parseNumber(value);
          break;
        case 'median_amount':
          (payer as PayersInformationV3).median_amount = parseNumber(value);
          break;
        case '10th_percentile':
          (payer as PayersInformationV3)['10th_percentile'] = parseNumber(value);
          break;
        case '90th_percentile':
          (payer as PayersInformationV3)['90th_percentile'] = parseNumber(value);
          break;
        case 'count':
          (payer as PayersInformationV3).count = value;
          break;
      }
    }

    // Build standard charge info
    const standardCharge: StandardChargesV2 | StandardChargesV3 = {
      setting,
      gross_charge: grossCharge,
      discounted_cash: discountedCash,
      minimum: min,
      maximum: max,
      additional_generic_notes: notes,
      payers_information: payerData.size > 0 ? Array.from(payerData.values()) : undefined,
    };

    const chargeInfo: StandardChargeInformationV2 | StandardChargeInformationV3 = {
      description,
      code_information: codes,
      standard_charges: [standardCharge as any],
    };

    if (drugUnit && drugType) {
      chargeInfo.drug_information = { unit: drugUnit, type: drugType };
    }

    if (onCharge) {
      await onCharge(chargeInfo, chargeCount);
    }

    chargeCount++;

    if (onProgress && chargeCount % progressInterval === 0) {
      onProgress(chargeCount, i * 100);
    }
  }

  return {
    metadata,
    chargeCount,
    format: 'wide',
  };
}
