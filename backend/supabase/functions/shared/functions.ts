import { ApiResponse } from './interfaces.ts';
import { createClient } from 'jsr:@supabase/supabase-js@^2';
import { OpenAIEmbeddings } from 'npm:@langchain/openai@1.1.0';
import { SupabaseVectorStore } from 'npm:@langchain/community@1.0.0/vectorstores/supabase';

export function validateEnvVars(): { valid: boolean; error?: string } {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  const embeddingModel = Deno.env.get('OPENAI_EMBEDDING_MODEL');
  const llmModel = Deno.env.get('OPENAI_CHAT_MODEL');
  const tmdbApiKey = Deno.env.get('TMDB_API_KEY');
  const tmdbApiToken = Deno.env.get('TMDB_API_TOKEN');

  if (!supabaseUrl) {
    return { valid: false, error: 'SUPABASE_URL not configured' };
  }
  if (!openAIApiKey) {
    return { valid: false, error: 'OPENAI_API_KEY not configured' };
  }
  if (!embeddingModel) {
    return { valid: false, error: 'OPENAI_EMBEDDING_MODEL not configured' };
  }
  if (!llmModel) {
    return { valid: false, error: 'OPENAI_CHAT_MODEL not configured' };
  }
  if (!tmdbApiKey) {
    return { valid: false, error: 'TMDB_API_KEY not configured' };
  }
  if (!tmdbApiToken) {
    return { valid: false, error: 'TMDB_API_TOKEN not configured' };
  }

  return { valid: true };
}

export function extractBearerToken(authHeader: string): string | null {
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split('Bearer ')[1];
  return token || null;
}

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }
  return null;
}

export function jsonResponse<R extends ApiResponse>(data: R, status: number = 200): Response {
  return new Response(JSON.stringify(data.error ? { ...data, status } : data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    },
  });
}

export function initSupabaseAndAI(req: Request) {
  // Validate environment variables
  const envValidation = validateEnvVars();
  if (!envValidation.valid) {
    return { error: envValidation.error! };
  }

  // Validate authorization
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { error: 'Authorization header required' };
  }

  const token = extractBearerToken(authHeader);
  if (!token) {
    return { error: 'Invalid authorization token' };
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

  return {
    supabaseClient,
    vectorStore,
    llmModel: Deno.env.get('OPENAI_CHAT_MODEL')!,
  };
}
