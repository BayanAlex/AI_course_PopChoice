import { Signal } from '@angular/core';
import { Recommendation, RecommendationError } from './recommendation.model';

export interface RagServiceModel {
  readonly isLoading: Signal<boolean>;
  readonly recommendation: Signal<Recommendation | RecommendationError | null>;

  fetchRecommendation(): Promise<void>;
}
