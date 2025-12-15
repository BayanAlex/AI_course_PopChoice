export interface Recommendation {
  title: string;
  description: string;
  releaseYear: string;
  poster: string;
}

interface BaseError {
  error: string;
}

export interface RecommendationErrorResponse extends BaseError {
  status: number;
}

export interface RecommendationError {
  error: string;
  canRetry?: boolean;
}
