import { NextRequest, NextResponse } from 'next/server';
import { suggestProcedures } from '@/lib/procedures-db';
import { ProcedureSuggestResponse } from '@/lib/types/procedure';

/**
 * Procedure autocomplete/suggestions using semantic search
 *
 * GET /api/procedures/suggest?q=knee&limit=6
 *
 * Returns quick suggestions for autocomplete UI (optimized for speed)
 */
export async function GET(request: NextRequest) {
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

    // Minimum query length for suggestions
    if (query.trim().length < 2) {
      return NextResponse.json<ProcedureSuggestResponse>({
        suggestions: [],
        query: query.trim()
      });
    }

    // Parse limit (default: 6, max: 10)
    let limit = 6;
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        limit = Math.min(parsed, 10);
      }
    }

    // Get suggestions
    const { suggestions } = await suggestProcedures(query.trim(), limit);

    const response: ProcedureSuggestResponse = {
      suggestions,
      query: query.trim()
    };

    return NextResponse.json(response, {
      headers: {
        // Cache suggestions for 1 minute
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300'
      }
    });

  } catch (error) {
    console.error('Procedure suggestion error:', error);

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('vectorSearch') || error.message.includes('index')) {
        return NextResponse.json(
          {
            error: 'Vector search index not configured',
            message: 'Please create the vector search index in MongoDB Atlas.'
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Suggestion failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
