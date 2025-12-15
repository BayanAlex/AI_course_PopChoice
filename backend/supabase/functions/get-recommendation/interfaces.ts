import { SuccessResponse } from '../shared/interfaces.ts';

export interface PollAnswer {
  favoriteMovie: string;
  freshness: string[];
  mood: string[];
  favoritePerson: string;
}

export interface GetRecommendationPayload {
  timeAvailable: string;
  pollAnswers: PollAnswer[];
  usedRecommendations: string[];
}

export interface RecommendationResponse extends SuccessResponse {
  title: string;
  description: string;
  releaseYear: string;
  poster: string | null;
}

export enum ErrorCodes {
  NO_MOVIES_FOUND = 'NO_MOVIES_FOUND',
  RETRIEVE_TOOL_NOT_CALLED = 'RETRIEVE_TOOL_NOT_CALLED',
}

export interface RetrieveToolWithState {
  lastRetrievedTitles?: string[];
  retrievalFailed?: boolean;
}

export interface MatchResult {
  content: string;
  metadata: Record<string, unknown>;
}

export interface RetrievedDoc {
  pageContent: string;
  metadata: Record<string, unknown>;
}
