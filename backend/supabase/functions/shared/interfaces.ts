export interface ErrorResponse {
  error: string;
  status?: number;
}

export type SuccessResponse = Record<string, any>;

export type ApiResponse = ErrorResponse | SuccessResponse;
