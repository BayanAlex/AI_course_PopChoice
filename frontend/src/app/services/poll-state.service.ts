import { Injectable, signal, Signal, computed } from '@angular/core';
import { MoviePollData } from '../models/movie-poll-data.model';

@Injectable({
  providedIn: 'root',
})
export class PollStateService {
  private readonly _currentPollStep = signal(1);
  private readonly _peopleCount = signal(0);
  private readonly _timeAvailable = signal('');
  private readonly _pollData = signal<MoviePollData[]>([]);

  readonly currentPollStep: Signal<number> = this._currentPollStep.asReadonly();
  readonly peopleCount: Signal<number> = this._peopleCount.asReadonly();
  readonly timeAvailable: Signal<string> = this._timeAvailable.asReadonly();
  readonly pollData: Signal<MoviePollData[]> = this._pollData.asReadonly();

  readonly isPollCompleted = computed(() => this._pollData().length === this._peopleCount());
  readonly currentPollStepData = computed(() => this._pollData()[this._currentPollStep() - 1]);

  setPeopleCount(count: number): void {
    if (count < 0) {
      throw new Error('People count cannot be negative');
    }
    this._peopleCount.set(count);
  }

  setTimeAvailable(time: string): void {
    this._timeAvailable.set(time);
  }

  setCurrentPollStepData(data: MoviePollData): void {
    const currentIndex = this._currentPollStep() - 1;
    this._pollData.update((allData) => {
      const updated = [...allData];
      updated[currentIndex] = data;
      return updated;
    });
  }

  nextPollStep(): { finished: boolean } {
    if (this._currentPollStep() >= this._peopleCount()) {
      return { finished: true };
    }
    this._currentPollStep.update((step) => step + 1);
    return { finished: false };
  }

  setCurrentPollStep(step: number): void {
    if (step < 1 || step > this._peopleCount()) {
      throw new Error(`Invalid poll step: ${step}`);
    }
    this._currentPollStep.set(step);
  }

  resetPoll(): void {
    this._currentPollStep.set(1);
    this._pollData.set([]);
  }
}
