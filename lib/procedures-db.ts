import { Collection, Document } from 'mongodb';
import { getDatabase } from './mongodb';
import { getEmbedding, getEmbeddings } from './voyage';
import {
  Procedure,
  ProcedureCategory,
  ProcedureSearchResult,
  MetroAvailability,
  detectCategory,
  getCategoryHints
} from './types/procedure';

const COLLECTION_NAME = 'procedures';
const VECTOR_INDEX_NAME = 'procedure_vector_index2';
const EMBEDDING_DIMENSIONS = 1024;

// All available metros (derived from data)
const ALL_METROS = [
  { slug: 'Los_Angeles', name: 'Los Angeles' },
  { slug: 'Miami', name: 'Miami' }
];

/**
 * Get the procedures collection
 */
async function getProceduresCollection(): Promise<Collection<Procedure & Document>> {
  const db = await getDatabase();
  return db.collection<Procedure & Document>(COLLECTION_NAME);
}

/**
 * Initialize the procedures collection with required indexes
 */
export async function initializeProceduresCollection(): Promise<void> {
  const collection = await getProceduresCollection();

  // Create standard indexes
  await collection.createIndex({ id: 1 }, { unique: true });
  await collection.createIndex({ name: 'text' });
  await collection.createIndex({ category: 1 });
  await collection.createIndex({ 'metroAreas.slug': 1 });
  await collection.createIndex({ keywords: 1 });

  console.log('Procedures collection indexes created');
}

/**
 * Build rich search text for embedding generation
 */
export function buildSearchText(
  name: string,
  keywords: string[],
  category: ProcedureCategory
): string {
  const categoryHints = getCategoryHints(category);
  return [name, ...keywords, categoryHints].join(' ');
}

/**
 * Upsert a single procedure with embedding
 */
export async function upsertProcedure(
  id: string,
  name: string,
  keywords: string[],
  metroAreas: MetroAvailability[]
): Promise<void> {
  const collection = await getProceduresCollection();

  // Auto-detect category
  const category = detectCategory(id, keywords);

  // Build search text and generate embedding
  const searchText = buildSearchText(name, keywords, category);
  const embedding = await getEmbedding(searchText);

  const now = new Date();

  await collection.updateOne(
    { id },
    {
      $set: {
        name,
        keywords,
        searchText,
        category,
        embedding,
        metroAreas,
        updatedAt: now
      },
      $setOnInsert: {
        id,
        createdAt: now
      }
    },
    { upsert: true }
  );
}

/**
 * Bulk upsert procedures with batch embedding generation
 */
export async function bulkUpsertProcedures(
  procedures: {
    id: string;
    name: string;
    keywords: string[];
    metroAreas: MetroAvailability[];
  }[]
): Promise<{ inserted: number; updated: number }> {
  const collection = await getProceduresCollection();

  // Prepare all procedures with categories and search text
  const preparedProcedures = procedures.map(p => {
    const category = detectCategory(p.id, p.keywords);
    const searchText = buildSearchText(p.name, p.keywords, category);
    return { ...p, category, searchText };
  });

  // Generate embeddings in batches (VoyageAI has limits)
  // Free tier: 3 RPM limit - wait 21 seconds between batches
  const BATCH_SIZE = 50;
  const RATE_LIMIT_DELAY_MS = 21000; // 21 seconds to stay under 3 RPM
  const allEmbeddings: number[][] = [];
  const totalBatches = Math.ceil(preparedProcedures.length / BATCH_SIZE);

  for (let i = 0; i < preparedProcedures.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const batch = preparedProcedures.slice(i, i + BATCH_SIZE);
    const texts = batch.map(p => p.searchText);

    // Wait between batches to respect rate limit (skip first batch)
    if (i > 0) {
      console.log(`Waiting ${RATE_LIMIT_DELAY_MS / 1000}s for rate limit...`);
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
    }

    console.log(`Generating embeddings for batch ${batchNum}/${totalBatches}...`);
    const embeddings = await getEmbeddings(texts);
    allEmbeddings.push(...embeddings);
    console.log(`Batch ${batchNum}/${totalBatches} complete.`);
  }

  // Upsert all procedures
  const now = new Date();
  const bulkOps = preparedProcedures.map((p, index) => ({
    updateOne: {
      filter: { id: p.id },
      update: {
        $set: {
          name: p.name,
          keywords: p.keywords,
          searchText: p.searchText,
          category: p.category,
          embedding: allEmbeddings[index],
          metroAreas: p.metroAreas,
          updatedAt: now
        },
        $setOnInsert: {
          id: p.id,
          createdAt: now
        }
      },
      upsert: true
    }
  }));

  const result = await collection.bulkWrite(bulkOps);

  return {
    inserted: result.upsertedCount,
    updated: result.modifiedCount
  };
}

/**
 * Search procedures using vector similarity
 */
export async function searchProcedures(
  query: string,
  limit: number = 10
): Promise<{ results: ProcedureSearchResult[]; searchTimeMs: number }> {
  const startTime = Date.now();
  const collection = await getProceduresCollection();

  // Generate embedding for the query
  const queryEmbedding = await getEmbedding(query);

  // Perform vector search using $vectorSearch
  const results = await collection.aggregate([
    {
      $vectorSearch: {
        index: VECTOR_INDEX_NAME,
        path: 'embedding',
        queryVector: queryEmbedding,
        numCandidates: limit * 10, // Cast a wider net
        limit: limit
      }
    },
    {
      $project: {
        id: 1,
        name: 1,
        keywords: 1,
        category: 1,
        metroAreas: 1,
        score: { $meta: 'vectorSearchScore' }
      }
    }
  ]).toArray();

  const searchTimeMs = Date.now() - startTime;

  // Transform results to include metro availability
  const transformedResults: ProcedureSearchResult[] = results.map((doc) => {
    const metroSlugs = new Set((doc.metroAreas || []).map((m: MetroAvailability) => m.slug));

    return {
      id: doc.id,
      name: doc.name,
      score: doc.score,
      keywords: doc.keywords,
      category: doc.category,
      metroAvailability: ALL_METROS.map(metro => ({
        slug: metro.slug,
        name: metro.name,
        available: metroSlugs.has(metro.slug)
      }))
    };
  });

  return { results: transformedResults, searchTimeMs };
}

/**
 * Get procedure suggestions (for autocomplete)
 * Uses vector search with lower limit for fast response
 */
export async function suggestProcedures(
  query: string,
  limit: number = 6
): Promise<{ suggestions: { id: string; name: string; category: ProcedureCategory; matchScore: number }[] }> {
  const collection = await getProceduresCollection();

  // Generate embedding for the query
  const queryEmbedding = await getEmbedding(query);

  const results = await collection.aggregate([
    {
      $vectorSearch: {
        index: VECTOR_INDEX_NAME,
        path: 'embedding',
        queryVector: queryEmbedding,
        numCandidates: limit * 5,
        limit: limit
      }
    },
    {
      $project: {
        id: 1,
        name: 1,
        category: 1,
        matchScore: { $meta: 'vectorSearchScore' }
      }
    }
  ]).toArray();

  return {
    suggestions: results.map(doc => ({
      id: doc.id,
      name: doc.name,
      category: doc.category,
      matchScore: doc.matchScore
    }))
  };
}

/**
 * Get a single procedure by ID
 */
export async function getProcedureById(id: string): Promise<Procedure | null> {
  const collection = await getProceduresCollection();
  return collection.findOne({ id }) as Promise<Procedure | null>;
}

/**
 * Get all procedures (for dropdowns, etc.)
 */
export async function getAllProcedures(): Promise<Omit<Procedure, 'embedding' | 'searchText'>[]> {
  const collection = await getProceduresCollection();

  return collection.find({})
    .project({
      id: 1,
      name: 1,
      keywords: 1,
      category: 1,
      metroAreas: 1,
      createdAt: 1,
      updatedAt: 1
    })
    .sort({ name: 1 })
    .toArray() as Promise<Omit<Procedure, 'embedding' | 'searchText'>[]>;
}

/**
 * Get procedures by category
 */
export async function getProceduresByCategory(
  category: ProcedureCategory
): Promise<Omit<Procedure, 'embedding' | 'searchText'>[]> {
  const collection = await getProceduresCollection();

  return collection.find({ category })
    .project({
      id: 1,
      name: 1,
      keywords: 1,
      category: 1,
      metroAreas: 1
    })
    .sort({ name: 1 })
    .toArray() as Promise<Omit<Procedure, 'embedding' | 'searchText'>[]>;
}

/**
 * Get procedure count
 */
export async function getProcedureCount(): Promise<number> {
  const collection = await getProceduresCollection();
  return collection.countDocuments();
}

/**
 * Get category statistics
 */
export async function getCategoryStats(): Promise<{ category: string; count: number }[]> {
  const collection = await getProceduresCollection();

  return collection.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        category: '$_id',
        count: 1,
        _id: 0
      }
    },
    { $sort: { count: -1 } }
  ]).toArray() as Promise<{ category: string; count: number }[]>;
}

/**
 * Delete all procedures (for re-ingestion)
 */
export async function deleteAllProcedures(): Promise<number> {
  const collection = await getProceduresCollection();
  const result = await collection.deleteMany({});
  return result.deletedCount;
}

/**
 * Check if vector search index exists
 * Note: This requires Atlas Search API access
 */
export async function checkVectorIndexExists(): Promise<boolean> {
  try {
    const collection = await getProceduresCollection();
    const indexes = await collection.listSearchIndexes().toArray();
    return indexes.some(idx => idx.name === VECTOR_INDEX_NAME);
  } catch {
    // listSearchIndexes may not be available on all deployments
    return false;
  }
}

/**
 * Get the vector index definition for manual creation in Atlas UI
 */
export function getVectorIndexDefinition(): object {
  return {
    name: VECTOR_INDEX_NAME,
    type: 'vectorSearch',
    definition: {
      fields: [
        {
          type: 'vector',
          path: 'embedding',
          numDimensions: EMBEDDING_DIMENSIONS,
          similarity: 'cosine'
        }
      ]
    }
  };
}
