/**
 * Hospital Price Transparency (HPT) Data Types
 *
 * Based on CMS Data Dictionary v2.2 and v3.0
 * Regulation: 45 CFR Part 180
 *
 * Supports both JSON and CSV formats for machine-readable files (MRFs)
 */

// ============================================================================
// Common Types
// ============================================================================

/** Valid code types per CMS specification */
export type CodeType =
  | 'CPT' | 'HCPCS' | 'NDC' | 'RC' | 'ICD' | 'DRG' | 'MS-DRG'
  | 'R-DRG' | 'S-DRG' | 'APS-DRG' | 'AP-DRG' | 'APR-DRG' | 'APC'
  | 'LOCAL' | 'EAPG' | 'HIPPS' | 'CDT' | 'CDM' | 'TRIS-DRG'
  | 'CMG' | 'MS-LTC-DRG';  // CMG and MS-LTC-DRG added in v3.0

/** Drug measurement types */
export type DrugMeasurementType = 'GR' | 'ML' | 'ME' | 'UN' | 'F2' | 'GM' | 'EA';

/** Care setting */
export type Setting = 'inpatient' | 'outpatient' | 'both';

/** Billing class (v2.x) */
export type BillingClass = 'facility' | 'professional';

/** Pricing methodology */
export type Methodology =
  | 'case rate'
  | 'fee schedule'
  | 'percent of total billed charges'
  | 'per diem'
  | 'other';

/** US State/Territory codes */
export type StateCode =
  | 'AL' | 'AK' | 'AS' | 'AZ' | 'AR' | 'CA' | 'CO' | 'CT' | 'DE' | 'DC'
  | 'FM' | 'FL' | 'GA' | 'GU' | 'HI' | 'ID' | 'IL' | 'IN' | 'IA' | 'KS'
  | 'KY' | 'LA' | 'ME' | 'MH' | 'MD' | 'MA' | 'MI' | 'MN' | 'MS' | 'MO'
  | 'MT' | 'NE' | 'NV' | 'NH' | 'NJ' | 'NM' | 'NY' | 'NC' | 'ND' | 'MP'
  | 'OH' | 'OK' | 'OR' | 'PW' | 'PA' | 'PR' | 'RI' | 'SC' | 'SD' | 'TN'
  | 'TX' | 'UT' | 'VT' | 'VI' | 'VA' | 'WA' | 'WV' | 'WI' | 'WY';

// ============================================================================
// Code Information
// ============================================================================

export interface CodeInformation {
  code: string;
  type: CodeType;
}

// ============================================================================
// Drug Information
// ============================================================================

export interface DrugInformation {
  unit: number;
  type: DrugMeasurementType;
}

// ============================================================================
// License Information
// ============================================================================

export interface LicenseInformation {
  license_number?: string;
  state: StateCode;
}

// ============================================================================
// Attestation/Affirmation (v3.0 uses attestation, v2.x uses affirmation)
// ============================================================================

export interface AttestationV3 {
  attestation: string;
  confirm_attestation: boolean;
  attester_name: string;
}

export interface AffirmationV2 {
  affirmation: string;
  confirm_affirmation: boolean;
}

// ============================================================================
// Payer Information (varies by version)
// ============================================================================

/** Base payer information fields */
interface PayerInfoBase {
  payer_name: string;
  plan_name: string;
  additional_payer_notes?: string;
  methodology?: Methodology;
}

/** Payer information for v2.x */
export interface PayersInformationV2 extends PayerInfoBase {
  standard_charge_dollar?: number;
  standard_charge_algorithm?: string;
  standard_charge_percentage?: number;
  estimated_amount?: number;  // Removed in v3.0
}

/** Payer information for v3.0 */
export interface PayersInformationV3 extends PayerInfoBase {
  standard_charge_dollar?: number;
  standard_charge_algorithm?: string;
  standard_charge_percentage?: number;
  median_amount?: number;       // New in v3.0
  '10th_percentile'?: number;   // New in v3.0
  '90th_percentile'?: number;   // New in v3.0
  count?: string;               // New in v3.0: "0", "1 through 10", or integer >= 11
}

// ============================================================================
// Standard Charges Object
// ============================================================================

interface StandardChargesBase {
  minimum?: number;
  maximum?: number;
  gross_charge?: number;
  discounted_cash?: number;
  setting: Setting;
  modifier_code?: string[];  // New in v3.0 JSON
  additional_generic_notes?: string;
}

export interface StandardChargesV2 extends StandardChargesBase {
  billing_class?: BillingClass;  // v2.x only
  payers_information?: PayersInformationV2[];
}

export interface StandardChargesV3 extends StandardChargesBase {
  payers_information?: PayersInformationV3[];
}

// ============================================================================
// Standard Charge Information (per item/service)
// ============================================================================

interface StandardChargeInfoBase {
  description: string;
  code_information: CodeInformation[];
  drug_information?: DrugInformation;
}

export interface StandardChargeInformationV2 extends StandardChargeInfoBase {
  standard_charges: StandardChargesV2[];
}

export interface StandardChargeInformationV3 extends StandardChargeInfoBase {
  standard_charges: StandardChargesV3[];
}

// ============================================================================
// Modifier Information (v3.0 adds setting)
// ============================================================================

export interface ModifierPayerInformation {
  payer_name: string;
  plan_name: string;
  description: string;
}

export interface ModifierInformationV2 {
  description: string;
  code: string;
  modifier_payer_information: ModifierPayerInformation[];
}

export interface ModifierInformationV3 extends ModifierInformationV2 {
  setting?: Setting;  // New in v3.0
}

// ============================================================================
// Root Hospital MRF Structure
// ============================================================================

interface HospitalMRFBase {
  hospital_name: string;
  hospital_address: string | string[];
  last_updated_on: string;  // ISO 8601 date
  version: string;
}

/** v2.x Hospital MRF structure */
export interface HospitalMRFV2 extends HospitalMRFBase {
  hospital_location?: string[];  // Renamed to location_name in v3.0
  license_information: LicenseInformation;
  affirmation: AffirmationV2;
  financial_aid_policy?: string[];
  standard_charge_information: StandardChargeInformationV2[];
  modifier_information?: ModifierInformationV2[];
}

/** v3.0 Hospital MRF structure */
export interface HospitalMRFV3 extends HospitalMRFBase {
  location_name: string[];       // Renamed from hospital_location
  type_2_npi: string[];          // New in v3.0
  license_information: LicenseInformation;
  attestation: AttestationV3;    // Renamed from affirmation
  standard_charge_information: StandardChargeInformationV3[];
  modifier_information?: ModifierInformationV3[];
}

/** Union type for both versions */
export type HospitalMRF = HospitalMRFV2 | HospitalMRFV3;

// ============================================================================
// MongoDB Document Types
// ============================================================================

/** Hospital metadata document */
export interface HospitalDocument {
  _id?: string;
  hospitalId: string;              // Derived from file name
  hospitalName: string;
  addresses: string[];
  locations: string[];
  npiNumbers: string[];            // Empty for v2.x
  licenseNumber?: string;
  licenseState: StateCode;
  version: string;                 // CMS schema version
  lastUpdatedOn: Date;
  attestation: {
    text: string;
    confirmed: boolean;
    attesterName?: string;         // v3.0 only
  };
  financialAidPolicy?: string[];   // v2.x only
  sourceFile: string;
  ingestedAt: Date;
  chargeCount: number;
  modifierCount: number;
}

/** Standard charge document (denormalized for queries) */
export interface StandardChargeDocument {
  _id?: string;
  hospitalId: string;
  hospitalName: string;
  description: string;
  codes: CodeInformation[];
  primaryCode?: string;            // First CPT/HCPCS code if available
  primaryCodeType?: CodeType;
  setting: Setting;

  // Drug info (if applicable)
  drugUnit?: number;
  drugType?: DrugMeasurementType;

  // Universal charges
  grossCharge?: number;
  discountedCash?: number;
  minNegotiated?: number;
  maxNegotiated?: number;

  // Payer-specific charges (embedded)
  payerCharges: PayerChargeDocument[];

  // Modifiers that apply
  modifierCodes?: string[];

  // Notes
  genericNotes?: string;

  // Metadata
  sourceVersion: string;
  ingestedAt: Date;
}

/** Embedded payer charge subdocument */
export interface PayerChargeDocument {
  payerName: string;
  planName: string;
  methodology?: Methodology;

  // Charge types
  dollarAmount?: number;
  percentage?: number;
  algorithm?: string;

  // Allowed amount stats (v3.0)
  medianAmount?: number;
  percentile10?: number;
  percentile90?: number;
  countOfAllowedAmounts?: string;

  // Estimated amount (v2.x)
  estimatedAmount?: number;

  notes?: string;
}

/** Modifier document */
export interface ModifierDocument {
  _id?: string;
  hospitalId: string;
  code: string;
  description: string;
  setting?: Setting;
  payerModifications: {
    payerName: string;
    planName: string;
    description: string;
  }[];
  ingestedAt: Date;
}

// ============================================================================
// Ingestion Types
// ============================================================================

export interface IngestionStats {
  hospitalId: string;
  sourceFile: string;
  version: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';

  // Counts
  totalCharges: number;
  processedCharges: number;
  insertedCharges: number;
  updatedCharges: number;
  skippedCharges: number;
  failedCharges: number;

  totalModifiers: number;
  processedModifiers: number;

  // Memory and performance
  peakMemoryMB?: number;
  avgBatchTimeMs?: number;

  // Errors
  errors: IngestionError[];
}

export interface IngestionError {
  type: 'parse' | 'validation' | 'database' | 'unknown';
  message: string;
  itemIndex?: number;
  itemDescription?: string;
  timestamp: Date;
}

export interface IngestionOptions {
  batchSize?: number;           // Default: 500
  skipValidation?: boolean;     // Default: false
  upsert?: boolean;             // Default: true
  dryRun?: boolean;             // Default: false
  continueOnError?: boolean;    // Default: true
  progressCallback?: (stats: IngestionStats) => void;
}

// ============================================================================
// CSV-specific Types
// ============================================================================

/** CSV Tall format row */
export interface CSVTallRow {
  description: string;
  'code|[i]': string;
  'code|[i]|type': CodeType;
  modifiers?: string;
  setting: Setting;
  drug_unit_of_measurement?: string;
  drug_type_of_measurement?: DrugMeasurementType;
  'standard_charge|gross'?: string;
  'standard_charge|discounted_cash'?: string;
  payer_name?: string;
  plan_name?: string;
  'standard_charge|negotiated_dollar'?: string;
  'standard_charge|negotiated_percentage'?: string;
  'standard_charge|negotiated_algorithm'?: string;
  median_amount?: string;         // v3.0
  '10th_percentile'?: string;     // v3.0
  '90th_percentile'?: string;     // v3.0
  count?: string;                 // v3.0
  estimated_amount?: string;      // v2.x
  'standard_charge|methodology'?: Methodology;
  'standard_charge|min'?: string;
  'standard_charge|max'?: string;
  additional_generic_notes?: string;
}

/** Detected file format */
export type FileFormat = 'json' | 'csv-tall' | 'csv-wide';

/** Detected schema version */
export type SchemaVersion = '2.2.0' | '3.0.0' | 'unknown';

export interface FileMetadata {
  path: string;
  format: FileFormat;
  version: SchemaVersion;
  sizeBytes: number;
  estimatedRecords?: number;
}

// ============================================================================
// Type Guards and Utilities
// ============================================================================

export function isV3MRF(mrf: HospitalMRF): mrf is HospitalMRFV3 {
  return 'attestation' in mrf && 'location_name' in mrf;
}

export function isV2MRF(mrf: HospitalMRF): mrf is HospitalMRFV2 {
  return 'affirmation' in mrf || 'hospital_location' in mrf;
}

export function detectVersion(versionString: string): SchemaVersion {
  if (versionString.startsWith('3.')) return '3.0.0';
  if (versionString.startsWith('2.')) return '2.2.0';
  return 'unknown';
}

/** Primary billing code types to prioritize */
export const PRIMARY_CODE_TYPES: CodeType[] = ['CPT', 'HCPCS', 'MS-DRG', 'DRG', 'APC'];

export function findPrimaryCode(codes: CodeInformation[]): CodeInformation | undefined {
  for (const codeType of PRIMARY_CODE_TYPES) {
    const code = codes.find(c => c.type === codeType);
    if (code) return code;
  }
  return codes[0];
}
