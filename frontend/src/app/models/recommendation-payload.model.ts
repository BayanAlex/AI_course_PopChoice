export interface MoviePollAnswers {
  favoriteMovie: string;
  freshness: string[];
  mood: string[];
  favoritePerson: string;
}

export interface RecommendationPayload {
  timeAvailable: string;
  pollAnswers: MoviePollAnswers[];
  usedRecommendations: string[];
}
