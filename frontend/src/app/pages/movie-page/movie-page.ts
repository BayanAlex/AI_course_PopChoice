import { Component, OnInit, Signal } from '@angular/core';
import { RagMockService } from '../../services/rag-mock.service';
import { RagService } from '../../services/rag.service';
import { Recommendation } from '../../models/recommendation.model';

@Component({
  selector: 'app-movie-page',
  imports: [],
  templateUrl: './movie-page.html',
  styleUrl: './movie-page.scss',
  providers: [{ provide: RagService, useClass: RagMockService }],
})
export class MoviePage implements OnInit {
  readonly isLoading: Signal<boolean>;
  readonly recommendation: Signal<Recommendation | null>;

  constructor(private readonly ragService: RagService) {
    this.isLoading = this.ragService.isLoading;
    this.recommendation = this.ragService.recommendation;
  }

  ngOnInit(): void {
    this.loadRecommendation();
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
