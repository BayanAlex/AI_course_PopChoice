import { Injectable, signal } from '@angular/core';
import {
  Recommendation,
  RecommendationError,
  RecommendationErrorResponse,
} from '../models/recommendation.model';
import { RagServiceModel } from '../models/rag-service.model';
import { PollStateService } from './poll-state.service';
import { SupabaseService } from './supabase.service';
import { MoviePollAnswers, RecommendationPayload } from '../models/recommendation-payload.model';
import { FunctionsHttpError } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root',
})
export class RagService implements RagServiceModel {
  readonly isLoading = signal(false);
  readonly recommendation = signal<Recommendation | RecommendationError | null>(null);

  private usedRecommendations: string[] = [];

  constructor(private pollStatService: PollStateService, private supabaseService: SupabaseService) {}

  async fetchRecommendation(): Promise<void> {
    this.isLoading.set(true);

    const pollData = this.pollStatService.pollData();

    const objToArray = (obj: Record<string, boolean>) => Object.entries(obj).reduce((res: string[], entry: [string, boolean]) => entry[1] ? [...res, entry[0]] : res, []);
    const answers: MoviePollAnswers[] = pollData.map((data) => ({
      favoriteMovie: data.favoriteMovie,
      freshness: objToArray(data.freshness),
      mood: objToArray(data.mood),
      favoritePerson: data.favoritePerson
    }));
    const timeAvailable = this.pollStatService.timeAvailable();
    const payload: RecommendationPayload = {
      timeAvailable,
      pollAnswers: answers,
      usedRecommendations: this.usedRecommendations
    };
    console.log('get-recommendation payload:', payload);

    const { data, error } = await this.supabaseService.client.functions.invoke<Recommendation>('get-recommendation', { body: payload });
    this.isLoading.set(false);

    if (!data || error) {
      const unknownError: RecommendationError = {
        error: 'Unknown error occurred. Please try again.',
        canRetry: true
      };

      if (!error) {
        console.error('No data returned from get-recommendation function');
        this.recommendation.set(unknownError);
        return;
      }

      if (error instanceof FunctionsHttpError) {
        const errorObj = await error.context.json() as RecommendationErrorResponse;
        const recommendationError: RecommendationError = {
          error: errorObj.error,
          canRetry: false
        }
        console.error('Error fetching recommendation:', errorObj.error);
        if (errorObj.status === 500) {
          recommendationError.canRetry = true;
        }
        this.recommendation.set(recommendationError);
      } else {
        console.error('Unexpected error fetching recommendation:', error?.message);
        this.recommendation.set(unknownError);
      }

      return;
    }

    console.log('get-recommendation response:', data);
    this.recommendation.set(data);

    const existingIndex = this.usedRecommendations.indexOf(data.title);
    if (existingIndex !== -1) {
      this.usedRecommendations.splice(existingIndex, 1);
    }
    this.usedRecommendations.push(data.title);
  }

  resetUsedRecommendations(): void {
    this.usedRecommendations = [];
  }
}
