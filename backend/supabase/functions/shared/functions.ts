/// <reference types="https://deno.land/x/deno/cli/tsc/dts/lib.deno.d.ts" />

import { ErrorResponse, SuccessResponse } from "./interfaces";

export function validateEnvVars(): { valid: boolean; error?: string } {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  const embeddingModel = Deno.env.get('OPENAI_EMBEDDING_MODEL');

  if (!supabaseUrl) {
    return { valid: false, error: 'SUPABASE_URL not configured' };
  }
  if (!openAIApiKey) {
    return { valid: false, error: 'OPENAI_API_KEY not configured' };
  }
  if (!embeddingModel) {
    return { valid: false, error: 'OPENAI_EMBEDDING_MODEL not configured' };
  }

  return { valid: true };
}

export function jsonResponse(
  data: ErrorResponse | SuccessResponse,
  status: number = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}