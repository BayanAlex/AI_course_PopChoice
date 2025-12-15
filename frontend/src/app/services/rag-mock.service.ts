import { Injectable, signal } from '@angular/core';
import { Recommendation } from '../models/recommendation.model';
import { RagServiceModel } from '../models/rag-service.model';

const recommendations: Recommendation[] = [
  {
    title: 'Inception',
    description:
      'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a CEO.',
    releaseYear: '2010',
    poster: 'https://m.media-amazon.com/images/I/81p+xe8cbnL._AC_SY679_.jpg',
  },
  {
    title: 'The Matrix',
    description:
      'A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.',
    releaseYear: '1999',
    poster: 'https://m.media-amazon.com/images/I/51EG732BV3L._AC_.jpg',
  },
  {
    title: 'Interstellar',
    description:
      "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    releaseYear: '2014',
    poster: 'https://m.media-amazon.com/images/I/91obuWzA3XL._AC_SY679_.jpg',
  },
];

@Injectable({
  providedIn: 'root',
})
export class RagMockService implements RagServiceModel {
  readonly isLoading = signal(false);
  readonly recommendation = signal<Recommendation | null>(null);
  private recommendationIndex = 0;

  async fetchRecommendation(): Promise<void> {
    this.isLoading.set(true);
    // Simulate delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const index = this.recommendationIndex++ % recommendations.length;
    const recommendation = recommendations[index];
    this.recommendation.set(recommendation);
    this.isLoading.set(false);
  }
}
