import { Document } from '@langchain/core/documents';
import { SuccessResponse } from '../shared/interfaces.ts';

export interface LoadDataResult {
  success: boolean;
  data?: string;
  error?: string;
}

export interface CreateDocumentsResult {
  success: boolean;
  documents?: Document[];
  error?: string;
}

export interface EmbeddingsResponse extends SuccessResponse {
  documentsProcessed: number;
}
