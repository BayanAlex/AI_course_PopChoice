export interface ErrorResponse {
  error: string;
}

export interface SuccessResponse {
  status: string;
}

export interface EmbeddingsSuccessResponse extends SuccessResponse {
  documentsProcessed: number;
}