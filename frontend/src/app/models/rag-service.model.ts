import { Signal } from '@angular/core';
import { Recommendation } from './recommendation.model';

export interface RagServiceModel {
  readonly isLoading: Signal<boolean>;
  readonly recommendation: Signal<Recommendation | null>;

  fetchRecommendation(): Promise<void>;
}
