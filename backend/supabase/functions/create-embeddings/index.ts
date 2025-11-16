import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { OpenAIEmbeddings } from '@langchain/openai';
import { CreateDocumentsResult, LoadDataResult } from './interfaces.ts';
import { CHUNK_OVERLAP, CHUNK_SIZE, FILE_NAME } from './constants.ts';
import { jsonResponse, validateEnvVars } from '../shared/functions.ts';
import { EmbeddingsSuccessResponse } from '../shared/interfaces.ts';

Deno.serve(async (req: Request) => {
  // Validate request method
  if (req.method !== 'POST') {
    return jsonResponse({ error: `Method ${req.method} not allowed` }, 405);
  }

  // Validate environment variables
  const envValidation = validateEnvVars();
  if (!envValidation.valid) {
    console.error('Environment validation failed:', envValidation.error);
    return jsonResponse({ error: envValidation.error! }, 500);
  }

  // Validate authorization
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Authorization header required' }, 401);
  }

  const token = extractBearerToken(authHeader);
  if (!token) {
    return jsonResponse({ error: 'Invalid authorization token' }, 401);
  }

  // Initialize clients
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseClient = createClient(supabaseUrl, token);

  const embeddingModel = Deno.env.get('OPENAI_EMBEDDING_MODEL')!;
  const embeddings = new OpenAIEmbeddings({
    model: embeddingModel,
  });

  const vectorStore = new SupabaseVectorStore(embeddings, {
    client: supabaseClient,
    tableName: 'documents',
    queryName: 'match_documents',
  });

  // Load movies data
  console.log(`Loading movies data from ${FILE_NAME}...`);
  const moviesDataResult = await loadMoviesData(supabaseClient);
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
    await vectorStore.addDocuments(documentsResult.documents);
    console.log('Embeddings created successfully');

    return jsonResponse({
      status: 'success',
      documentsProcessed: documentsResult.documents.length,
    } as EmbeddingsSuccessResponse);
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
function extractBearerToken(authHeader: string): string | null {
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split('Bearer ')[1];
  return token || null;
}

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
    const documents = await splitter.createDocuments([text]);

    if (!documents || documents.length === 0) {
      return { success: false, error: 'No documents created from text' };
    }

    return { success: true, documents };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: `Failed to split documents: ${message}` };
  }
}
