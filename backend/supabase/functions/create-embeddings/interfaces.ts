import { Document } from '@langchain/core/documents';

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