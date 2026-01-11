import { NextRequest, NextResponse } from 'next/server';
import { searchProcedures } from '@/lib/procedures-db';
import { ProcedureSearchResponse } from '@/lib/types/procedure';

/**
 * Semantic procedure search using VoyageAI embeddings + MongoDB vector search
 *
 * GET /api/procedures/search?q=heart+problem&limit=10
 *
 * Returns procedures ranked by semantic similarity to the query
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const limitParam = searchParams.get('limit');

    // Validate query parameter
    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Missing required parameter: q',
          message: 'Please provide a search query'
        },
        { status: 400 }
      );
    }

    // Parse limit (default: 10, max: 50)
    let limit = 10;
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        limit = Math.min(parsed, 50);
      }
    }

    // Perform semantic search
    const { results, searchTimeMs } = await searchProcedures(query.trim(), limit);

    // Build response
    const response: ProcedureSearchResponse = {
      results,
      query: query.trim(),
      totalFound: results.length,
      metros: ['Los_Angeles', 'Miami'],
      searchTimeMs
    };

    // Add timing header
    const totalTimeMs = Date.now() - startTime;

    return NextResponse.json(response, {
      headers: {
        'X-Search-Time-Ms': searchTimeMs.toString(),
        'X-Total-Time-Ms': totalTimeMs.toString()
      }
    });

  } catch (error) {
    console.error('Procedure search error:', error);

    // Check for specific error types
    if (error instanceof Error) {
      // Vector index not found
      if (error.message.includes('vectorSearch') || error.message.includes('index')) {
        return NextResponse.json(
          {
            error: 'Vector search index not configured',
            message: 'Please create the vector search index in MongoDB Atlas. See the ingestion script output for instructions.'
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
