import { Injectable, signal } from '@angular/core';
import { Recommendation } from '../models/recommendation.model';
import { RagServiceModel } from '../models/rag-service.model';

@Injectable({
  providedIn: 'root',
})
export class RagService implements RagServiceModel {
  readonly isLoading = signal(false);
  readonly recommendation = signal<Recommendation | null>(null);

  async fetchRecommendation(): Promise<void> {
    /* empty */
  }
}
