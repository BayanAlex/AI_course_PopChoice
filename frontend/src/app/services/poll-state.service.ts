import { Injectable, signal, Signal, computed } from '@angular/core';
import { MoviePollData } from '../models/movie-poll-data.model';

const FIRST_POLL_STEP = 1;

@Injectable({
  providedIn: 'root',
})
export class PollStateService {
  private readonly _currentPollStep = signal(FIRST_POLL_STEP);
  private readonly _peopleCount = signal(0);
  private readonly _timeAvailable = signal('');
  private readonly _pollData = signal<MoviePollData[]>([]);

  readonly currentPollStep: Signal<number> = this._currentPollStep.asReadonly();
  readonly peopleCount: Signal<number> = this._peopleCount.asReadonly();
  readonly timeAvailable: Signal<string> = this._timeAvailable.asReadonly();

  readonly isPollCompleted = computed(() => this._pollData().length === this._peopleCount());

  readonly currentPollStepData = computed(() => this._pollData()[this._currentPollStep() - 1]);

  readonly allPollData = computed(() => this._pollData());

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

  resetPoll(): void {
    this._currentPollStep.set(FIRST_POLL_STEP);
    this._pollData.set([]);
  }

  resetAll(): void {
    this.resetPoll();
    this._peopleCount.set(0);
    this._timeAvailable.set('');
  }
}
