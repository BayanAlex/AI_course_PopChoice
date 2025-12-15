import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { SupabaseClient } from '@supabase/supabase-js';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { CreateDocumentsResult, LoadDataResult } from './interfaces.ts';
import { CHUNK_OVERLAP, CHUNK_SIZE, FILE_NAME } from './constants.ts';
import {
  initSupabaseAndAI,
  jsonResponse,
  handleCors,
} from '../shared/functions.ts';
import { EmbeddingsResponse } from './interfaces.ts';

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  const initResult = initSupabaseAndAI(req);
  if (initResult.error) {
    console.error('Initialization failed:', initResult.error);
    return jsonResponse({ error: initResult.error });
  }

  const { supabaseClient, vectorStore } = initResult;

  // Load movies data
  console.log(`Loading movies data from ${FILE_NAME}...`);
  const moviesDataResult = await loadMoviesData(supabaseClient!);
  if (!moviesDataResult.success || !moviesDataResult.data) {
    console.error('Failed to load movies data:', moviesDataResult.error);

    return jsonResponse(
      { error: moviesDataResult.error || 'Failed to load movies data' },
      500
    );
  }

  // Create document chunks
  console.log('Creating document chunks...');
  const documentsResult = await createDocuments(
    moviesDataResult.data,
    CHUNK_SIZE,
    CHUNK_OVERLAP
  );
  if (!documentsResult.success || !documentsResult.documents) {
    console.error('Failed to create documents:', documentsResult.error);

    return jsonResponse(
      { error: documentsResult.error || 'Failed to create document chunks' },
      500
    );
  }

  // Store embeddings
  console.log(`Storing ${documentsResult.documents.length} document chunks...`);
  try {
    await vectorStore!.addDocuments(documentsResult.documents);
    console.log('Embeddings created successfully');

    return jsonResponse<EmbeddingsResponse>({
      documentsProcessed: documentsResult.documents.length,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to create embeddings:', errorMessage);

    return jsonResponse(
      { error: `Failed to create embeddings: ${errorMessage}` },
      500
    );
  }
});

// Functions

async function loadMoviesData(
  supabaseClient: SupabaseClient
): Promise<LoadDataResult> {
  try {
    const { data, error } = await supabaseClient.storage
      .from('rag_data')
      .download(FILE_NAME);

    if (error) {
      return { success: false, error: `Storage error: ${error.message}` };
    }

    if (!data) {
      return { success: false, error: 'No data returned from storage' };
    }

    const text = await data.text();
    if (!text || text.trim().length === 0) {
      return { success: false, error: 'File is empty' };
    }

    return { success: true, data: text };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: `Failed to load file: ${message}` };
  }
}

async function createDocuments(
  text: string,
  chunkSize: number,
  chunkOverlap: number
): Promise<CreateDocumentsResult> {
  try {
    if (!text || text.trim().length === 0) {
      return { success: false, error: 'Input text is empty' };
    }

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
    });

    // Split text into movie blocks (separated by double newlines)
    const movieBlocks = text.split('\n\n').filter((block) => block.trim());
    const documentsWithMetadata = [];

    for (const block of movieBlocks) {
      // Parse Duration, Year and Rating from each movie block
      const durationMatch = block.match(/Duration:\s*(\d+)h?\s*(\d+)?m?/i);
      const yearMatch = block.match(/Year:\s*(\d{4})/i);
      const ratingMatch = block.match(/Rating:\s*([\d.]+)/i);

      let durationMinutes: number | undefined;
      if (durationMatch) {
        const hours = parseInt(durationMatch[1]) || 0;
        const minutes = parseInt(durationMatch[2]) || 0;
        durationMinutes = hours * 60 + minutes;
      }

      const releaseYear = yearMatch ? parseInt(yearMatch[1]) : undefined;
      const rating = ratingMatch ? parseFloat(ratingMatch[1]) : undefined;

      // Create document chunks for this movie with metadata
      const chunks = await splitter.createDocuments([block]);

      // Add metadata to each chunk
      for (const chunk of chunks) {
        documentsWithMetadata.push({
          ...chunk,
          metadata: {
            ...(durationMinutes !== undefined && { durationMinutes }),
            ...(releaseYear !== undefined && { releaseYear }),
            ...(rating !== undefined && { rating }),
          },
        });
      }
    }

    if (!documentsWithMetadata || documentsWithMetadata.length === 0) {
      return { success: false, error: 'No documents created from text' };
    }

    console.log(
      `Created ${documentsWithMetadata.length} document chunks with metadata`
    );
    console.log('Sample metadata:', documentsWithMetadata[0]?.metadata);

    return { success: true, documents: documentsWithMetadata };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: `Failed to split documents: ${message}` };
  }
}
