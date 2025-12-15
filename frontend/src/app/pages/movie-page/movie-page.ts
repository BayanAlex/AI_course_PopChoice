import { Component, OnDestroy, OnInit, Signal } from '@angular/core';
import { RagService } from '../../services/rag.service';
import { Recommendation, RecommendationError } from '../../models/recommendation.model';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-movie-page',
  imports: [RouterLink],
  templateUrl: './movie-page.html',
  styleUrl: './movie-page.scss',
  providers: [{ provide: RagService, useClass: RagService }],
})
export class MoviePage implements OnInit, OnDestroy {
  readonly isLoading: Signal<boolean>;
  readonly recommendation: Signal<Recommendation | RecommendationError | null>;

  constructor(private readonly ragService: RagService) {
    this.isLoading = this.ragService.isLoading;
    this.recommendation = this.ragService.recommendation;
  }

  isRecommendationError(
    recommendation: Recommendation | RecommendationError | null
  ): recommendation is RecommendationError {
    return (recommendation as RecommendationError)?.error !== undefined;
  }

  isRecommendation(
    recommendation: Recommendation | RecommendationError | null
  ): recommendation is Recommendation {
    return (recommendation as Recommendation)?.title !== undefined;
  }

  get movie(): Recommendation | null {
    const r = this.recommendation();
    return r && this.isRecommendation(r) ? r : null;
  }

  get error(): RecommendationError | null {
    const r = this.recommendation();
    return r && this.isRecommendationError(r) ? r : null;
  }

  ngOnInit(): void {
    this.loadRecommendation();
  }

  ngOnDestroy(): void {
    this.ragService.resetUsedRecommendations();
  }

  async loadRecommendation(): Promise<void> {
    try {
      await this.ragService.fetchRecommendation();
    } catch (error) {
      console.error('Failed to load recommendation:', error);
    }
  }

  nextMovie(): void {
    this.loadRecommendation();
  }
}
