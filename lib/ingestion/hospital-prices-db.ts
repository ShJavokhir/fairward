/**
 * MongoDB Database Layer for Hospital Price Transparency Data
 *
 * Handles:
 * - Collection initialization with indexes
 * - Batch insert/upsert operations
 * - Query utilities for price lookups
 */

import { getDatabase } from '../mongodb';
import type { Collection, Db, BulkWriteResult, IndexDescription } from 'mongodb';
import type {
  HospitalDocument,
  StandardChargeDocument,
  ModifierDocument,
  PayerChargeDocument,
  CodeInformation,
  CodeType,
  Setting,
  Methodology,
  DrugMeasurementType,
  StandardChargeInformationV2,
  StandardChargeInformationV3,
  StandardChargesV2,
  StandardChargesV3,
  PayersInformationV2,
  PayersInformationV3,
} from '../types/hospital-prices';
import { PRIMARY_CODE_TYPES } from '../types/hospital-prices';

// Collection names
const HOSPITALS_COLLECTION = 'hospitals';
const CHARGES_COLLECTION = 'hospital_charges';
const MODIFIERS_COLLECTION = 'hospital_modifiers';

// Database name
const DB_NAME = 'main';

// Batch sizes
const DEFAULT_BATCH_SIZE = 500;
const MAX_BATCH_SIZE = 2000;

/**
 * Get the hospitals collection
 */
export async function getHospitalsCollection(): Promise<Collection<HospitalDocument>> {
  const db = await getDatabase(DB_NAME);
  return db.collection<HospitalDocument>(HOSPITALS_COLLECTION);
}

/**
 * Get the charges collection
 */
export async function getChargesCollection(): Promise<Collection<StandardChargeDocument>> {
  const db = await getDatabase(DB_NAME);
  return db.collection<StandardChargeDocument>(CHARGES_COLLECTION);
}

/**
 * Get the modifiers collection
 */
export async function getModifiersCollection(): Promise<Collection<ModifierDocument>> {
  const db = await getDatabase(DB_NAME);
  return db.collection<ModifierDocument>(MODIFIERS_COLLECTION);
}

/**
 * Initialize collections with proper indexes
 */
export async function initializeHospitalPriceCollections(): Promise<void> {
  const db = await getDatabase(DB_NAME);

  console.log('Initializing hospital price collections...');

  // Hospital collection indexes
  const hospitalsCollection = db.collection(HOSPITALS_COLLECTION);
  const hospitalIndexes: IndexDescription[] = [
    { key: { hospitalId: 1 }, unique: true },
    { key: { hospitalName: 'text' } },
    { key: { 'addresses': 1 } },
    { key: { licenseState: 1 } },
    { key: { npiNumbers: 1 } },
    { key: { ingestedAt: -1 } },
  ];

  for (const index of hospitalIndexes) {
    try {
      const options: { background: boolean; unique?: boolean } = { background: true };
      if (index.unique === true) options.unique = true;
      await hospitalsCollection.createIndex(index.key, options);
    } catch (error) {
      // Index may already exist
      console.log(`Index creation note: ${(error as Error).message}`);
    }
  }

  // Charges collection indexes
  const chargesCollection = db.collection(CHARGES_COLLECTION);
  const chargeIndexes: IndexDescription[] = [
    // Compound index for hospital + code lookups (most common query)
    { key: { hospitalId: 1, primaryCode: 1, primaryCodeType: 1 } },

    // Index for code-based searches across all hospitals
    { key: { primaryCode: 1, primaryCodeType: 1 } },

    // Index for searching by any code
    { key: { 'codes.code': 1, 'codes.type': 1 } },

    // Text search on description
    { key: { description: 'text', hospitalName: 'text' } },

    // Setting filter
    { key: { setting: 1 } },

    // Price range queries
    { key: { grossCharge: 1 } },
    { key: { discountedCash: 1 } },

    // Payer queries
    { key: { 'payerCharges.payerName': 1 } },
    { key: { 'payerCharges.planName': 1 } },

    // For finding charges by hospital
    { key: { hospitalId: 1, ingestedAt: -1 } },

    // Drug queries
    { key: { drugType: 1 } },
  ];

  for (const index of chargeIndexes) {
    try {
      await chargesCollection.createIndex(index.key, { background: true });
    } catch (error) {
      console.log(`Index creation note: ${(error as Error).message}`);
    }
  }

  // Modifiers collection indexes
  const modifiersCollection = db.collection(MODIFIERS_COLLECTION);
  const modifierIndexes: IndexDescription[] = [
    { key: { hospitalId: 1, code: 1 }, unique: true },
    { key: { code: 1 } },
  ];

  for (const index of modifierIndexes) {
    try {
      const options: { background: boolean; unique?: boolean } = { background: true };
      if (index.unique === true) options.unique = true;
      await modifiersCollection.createIndex(index.key, options);
    } catch (error) {
      console.log(`Index creation note: ${(error as Error).message}`);
    }
  }

  console.log('Hospital price collections initialized.');
}

/**
 * Convert raw charge data to database document format
 */
export function chargeToDocument(
  charge: StandardChargeInformationV2 | StandardChargeInformationV3,
  hospitalId: string,
  hospitalName: string,
  sourceVersion: string
): StandardChargeDocument[] {
  const documents: StandardChargeDocument[] = [];
  const now = new Date();

  // Find primary code
  const primaryCodeInfo = findPrimaryCodes(charge.code_information);

  // Create a document for each setting in standard_charges
  for (const standardCharge of charge.standard_charges) {
    const payerCharges: PayerChargeDocument[] = [];

    // Convert payer information
    if (standardCharge.payers_information) {
      for (const payer of standardCharge.payers_information) {
        const payerDoc: PayerChargeDocument = {
          payerName: payer.payer_name,
          planName: payer.plan_name,
          methodology: payer.methodology,
          dollarAmount: payer.standard_charge_dollar,
          percentage: payer.standard_charge_percentage,
          algorithm: payer.standard_charge_algorithm,
          notes: payer.additional_payer_notes,
        };

        // v3.0 fields
        if ('median_amount' in payer) {
          const v3Payer = payer as PayersInformationV3;
          payerDoc.medianAmount = v3Payer.median_amount;
          payerDoc.percentile10 = v3Payer['10th_percentile'];
          payerDoc.percentile90 = v3Payer['90th_percentile'];
          payerDoc.countOfAllowedAmounts = v3Payer.count;
        }

        // v2.x fields
        if ('estimated_amount' in payer) {
          payerDoc.estimatedAmount = (payer as PayersInformationV2).estimated_amount;
        }

        payerCharges.push(payerDoc);
      }
    }

    const doc: StandardChargeDocument = {
      hospitalId,
      hospitalName,
      description: charge.description,
      codes: charge.code_information,
      primaryCode: primaryCodeInfo?.code,
      primaryCodeType: primaryCodeInfo?.type,
      setting: standardCharge.setting,
      grossCharge: standardCharge.gross_charge,
      discountedCash: standardCharge.discounted_cash,
      minNegotiated: standardCharge.minimum,
      maxNegotiated: standardCharge.maximum,
      payerCharges,
      genericNotes: standardCharge.additional_generic_notes,
      sourceVersion,
      ingestedAt: now,
    };

    // Add drug info if present
    if (charge.drug_information) {
      doc.drugUnit = charge.drug_information.unit;
      doc.drugType = charge.drug_information.type;
    }

    // Add modifier codes if present (v3.0)
    if ('modifier_code' in standardCharge && standardCharge.modifier_code) {
      doc.modifierCodes = standardCharge.modifier_code;
    }

    documents.push(doc);
  }

  return documents;
}

/**
 * Find the primary billing code from a list
 */
function findPrimaryCodes(codes: CodeInformation[]): CodeInformation | undefined {
  for (const codeType of PRIMARY_CODE_TYPES) {
    const code = codes.find(c => c.type === codeType);
    if (code) return code;
  }
  return codes[0];
}

/**
 * Batch insert charge documents
 */
export async function batchInsertCharges(
  documents: StandardChargeDocument[],
  options: { upsert?: boolean } = {}
): Promise<{ inserted: number; modified: number; errors: number }> {
  if (documents.length === 0) {
    return { inserted: 0, modified: 0, errors: 0 };
  }

  const collection = await getChargesCollection();
  const { upsert = true } = options;

  let inserted = 0;
  let modified = 0;
  let errors = 0;

  if (upsert) {
    // Use bulkWrite for upsert operations
    const operations = documents.map(doc => ({
      updateOne: {
        filter: {
          hospitalId: doc.hospitalId,
          description: doc.description,
          setting: doc.setting,
          // Include primary code to make it more specific
          primaryCode: doc.primaryCode,
          primaryCodeType: doc.primaryCodeType,
        },
        update: { $set: doc },
        upsert: true,
      },
    }));

    try {
      const result = await collection.bulkWrite(operations, { ordered: false });
      inserted = result.upsertedCount;
      modified = result.modifiedCount;
    } catch (error: any) {
      // Handle partial failures
      if (error.writeErrors) {
        errors = error.writeErrors.length;
        inserted = error.result?.nUpserted || 0;
        modified = error.result?.nModified || 0;
      } else {
        throw error;
      }
    }
  } else {
    // Simple insert
    try {
      const result = await collection.insertMany(documents, { ordered: false });
      inserted = result.insertedCount;
    } catch (error: any) {
      if (error.writeErrors) {
        errors = error.writeErrors.length;
        inserted = error.result?.nInserted || 0;
      } else {
        throw error;
      }
    }
  }

  return { inserted, modified, errors };
}

/**
 * Upsert hospital metadata document
 */
export async function upsertHospital(hospital: HospitalDocument): Promise<boolean> {
  const collection = await getHospitalsCollection();

  const result = await collection.updateOne(
    { hospitalId: hospital.hospitalId },
    { $set: hospital },
    { upsert: true }
  );

  return result.upsertedCount > 0 || result.modifiedCount > 0;
}

/**
 * Batch insert modifier documents
 */
export async function batchInsertModifiers(
  documents: ModifierDocument[]
): Promise<{ inserted: number; modified: number; errors: number }> {
  if (documents.length === 0) {
    return { inserted: 0, modified: 0, errors: 0 };
  }

  const collection = await getModifiersCollection();

  const operations = documents.map(doc => ({
    updateOne: {
      filter: {
        hospitalId: doc.hospitalId,
        code: doc.code,
      },
      update: { $set: doc },
      upsert: true,
    },
  }));

  let inserted = 0;
  let modified = 0;
  let errors = 0;

  try {
    const result = await collection.bulkWrite(operations, { ordered: false });
    inserted = result.upsertedCount;
    modified = result.modifiedCount;
  } catch (error: any) {
    if (error.writeErrors) {
      errors = error.writeErrors.length;
      inserted = error.result?.nUpserted || 0;
      modified = error.result?.nModified || 0;
    } else {
      throw error;
    }
  }

  return { inserted, modified, errors };
}

/**
 * Get collection statistics
 */
export async function getCollectionStats(): Promise<{
  hospitals: number;
  charges: number;
  modifiers: number;
}> {
  const [hospitals, charges, modifiers] = await Promise.all([
    getHospitalsCollection().then(c => c.countDocuments()),
    getChargesCollection().then(c => c.countDocuments()),
    getModifiersCollection().then(c => c.countDocuments()),
  ]);

  return { hospitals, charges, modifiers };
}

/**
 * Delete all charges for a specific hospital (for re-ingestion)
 */
export async function deleteHospitalCharges(hospitalId: string): Promise<number> {
  const collection = await getChargesCollection();
  const result = await collection.deleteMany({ hospitalId });
  return result.deletedCount;
}

/**
 * Delete all modifiers for a specific hospital
 */
export async function deleteHospitalModifiers(hospitalId: string): Promise<number> {
  const collection = await getModifiersCollection();
  const result = await collection.deleteMany({ hospitalId });
  return result.deletedCount;
}

/**
 * Search charges by code
 */
export async function searchChargesByCode(
  code: string,
  codeType?: CodeType,
  options: {
    hospitalId?: string;
    setting?: Setting;
    limit?: number;
  } = {}
): Promise<StandardChargeDocument[]> {
  const collection = await getChargesCollection();
  const { hospitalId, setting, limit = 100 } = options;

  const query: Record<string, any> = {};

  // Code search - try primary code first, then all codes
  if (codeType) {
    query.$or = [
      { primaryCode: code, primaryCodeType: codeType },
      { 'codes.code': code, 'codes.type': codeType },
    ];
  } else {
    query.$or = [
      { primaryCode: code },
      { 'codes.code': code },
    ];
  }

  if (hospitalId) query.hospitalId = hospitalId;
  if (setting) query.setting = setting;

  return collection.find(query).limit(limit).toArray();
}

/**
 * Search charges by description (text search)
 */
export async function searchChargesByDescription(
  searchText: string,
  options: {
    hospitalId?: string;
    setting?: Setting;
    limit?: number;
  } = {}
): Promise<StandardChargeDocument[]> {
  const collection = await getChargesCollection();
  const { hospitalId, setting, limit = 100 } = options;

  const query: Record<string, any> = {
    $text: { $search: searchText },
  };

  if (hospitalId) query.hospitalId = hospitalId;
  if (setting) query.setting = setting;

  return collection
    .find(query)
    .project({ score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .toArray();
}

/**
 * Get price statistics for a code across all hospitals
 */
export async function getPriceStatsByCode(
  code: string,
  codeType?: CodeType
): Promise<{
  count: number;
  avgGross: number | null;
  minGross: number | null;
  maxGross: number | null;
  avgDiscounted: number | null;
}> {
  const collection = await getChargesCollection();

  const match: Record<string, any> = codeType
    ? { primaryCode: code, primaryCodeType: codeType }
    : { primaryCode: code };

  const result = await collection.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        avgGross: { $avg: '$grossCharge' },
        minGross: { $min: '$grossCharge' },
        maxGross: { $max: '$grossCharge' },
        avgDiscounted: { $avg: '$discountedCash' },
      },
    },
  ]).toArray();

  if (result.length === 0) {
    return {
      count: 0,
      avgGross: null,
      minGross: null,
      maxGross: null,
      avgDiscounted: null,
    };
  }

  return result[0];
}

/**
 * Get unique payers across all hospitals
 */
export async function getUniquePayers(): Promise<Array<{ payerName: string; planCount: number }>> {
  const collection = await getChargesCollection();

  return collection.aggregate([
    { $unwind: '$payerCharges' },
    {
      $group: {
        _id: '$payerCharges.payerName',
        plans: { $addToSet: '$payerCharges.planName' },
      },
    },
    {
      $project: {
        _id: 0,
        payerName: '$_id',
        planCount: { $size: '$plans' },
      },
    },
    { $sort: { planCount: -1 } },
  ]).toArray() as Promise<Array<{ payerName: string; planCount: number }>>;
}

/**
 * Get all hospitals
 */
export async function getAllHospitals(): Promise<HospitalDocument[]> {
  const collection = await getHospitalsCollection();
  return collection.find().sort({ hospitalName: 1 }).toArray();
}

/**
 * Get hospital by ID
 */
export async function getHospitalById(hospitalId: string): Promise<HospitalDocument | null> {
  const collection = await getHospitalsCollection();
  return collection.findOne({ hospitalId });
}
