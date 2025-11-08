import { Component, computed, effect, OnInit, Signal, signal } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { Router } from '@angular/router';
import { PollStateService } from '../../services/poll-state.service';
import { MoviePollData } from '../../models/movie-poll-data.model';
import { MOVIE_OPTIONS } from '../../app.constants';
import { KeyValuePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';

const atLeastOneSelectedValidator = (): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    const atLeastOneSelected = Object.values(control.value).some((val) => val);
    return atLeastOneSelected ? null : { atLeastOneRequired: true };
  };
};

class PollFormBuilder {
  private static createCheckboxGroup(formBuilder: FormBuilder, options: string[]): FormGroup {
    const controls = options.reduce(
      (acc, option) => {
        acc[option.toLowerCase()] = new FormControl(false, {
          nonNullable: true,
        });
        return acc;
      },
      {} as Record<string, FormControl<boolean>>
    );

    return formBuilder.group(controls, {
      validators: [atLeastOneSelectedValidator()],
    });
  }

  static createPollForm(formBuilder: FormBuilder): FormGroup {
    return formBuilder.nonNullable.group({
      favoriteMovie: ['', Validators.required],
      freshness: this.createCheckboxGroup(formBuilder, MOVIE_OPTIONS.freshness),
      mood: this.createCheckboxGroup(formBuilder, MOVIE_OPTIONS.mood),
      favoritePerson: ['', Validators.required],
    });
  }
}

const POLL_QUESTIONS_WITH_OPTIONS = {
  freshness: {
    caption: 'How fresh is your favorite movie?',
    options: MOVIE_OPTIONS.freshness,
  },
  mood: {
    caption: 'What mood are you in?',
    options: MOVIE_OPTIONS.mood,
  },
} as const;

@Component({
  selector: 'app-poll-page',
  imports: [ReactiveFormsModule, KeyValuePipe],
  templateUrl: './poll-page.html',
  styleUrl: './poll-page.scss',
})
export class PollPage implements OnInit {
  readonly formValidated = signal(false);
  readonly questionsWithOptions = POLL_QUESTIONS_WITH_OPTIONS;
  readonly form: FormGroup;
  readonly pollStep: Signal<number>;

  readonly submitCaption = computed(() =>
    this.pollStep() === this.pollStateService.peopleCount() ? 'Get Movie' : 'Next Person'
  );

  private readonly formChanges: Signal<MoviePollData | undefined>;

  constructor(
    private readonly router: Router,
    private readonly formBuilder: FormBuilder,
    private readonly pollStateService: PollStateService
  ) {
    this.form = PollFormBuilder.createPollForm(this.formBuilder);
    this.pollStep = this.pollStateService.currentPollStep;
    this.formChanges = toSignal(this.form.valueChanges);

    effect(() => {
      const changes = this.formChanges();
      if (changes) {
        this.pollStateService.setCurrentPollStepData(changes as MoviePollData);
      }
    });
  }

  ngOnInit(): void {
    this.loadExistingData();
  }

  private loadExistingData(): void {
    const currentData = this.pollStateService.currentPollStepData();
    if (currentData) {
      this.form.patchValue(currentData, { emitEvent: false });
    }
  }

  onSubmit(): void {
    if (!this.form.valid) {
      this.handleInvalidForm();
      return;
    }

    this.handleValidForm();
  }

  private handleInvalidForm(): void {
    this.formValidated.set(true);
    this.form.markAllAsTouched();
  }

  private handleValidForm(): void {
    this.pollStateService.setCurrentPollStepData(this.form.getRawValue() as MoviePollData);

    const { finished } = this.pollStateService.nextPollStep();

    if (finished) {
      this.router.navigate(['/movie']);
    } else {
      this.prepareForNextPerson();
    }
  }

  private prepareForNextPerson(): void {
    this.form.reset();
    this.formValidated.set(false);
  }
}
