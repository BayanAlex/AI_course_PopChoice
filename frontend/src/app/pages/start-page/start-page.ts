import { Component, effect, OnInit, Signal, signal } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MAX_PEOPLE_COUNT } from '../../app.constants';
import { PollStateService } from '../../services/poll-state.service';

const PEOPLE_COUNT_PLACEHOLDER = 'How many people?';

@Component({
  selector: 'app-start-page',
  imports: [ReactiveFormsModule],
  templateUrl: './start-page.html',
  styleUrl: './start-page.scss',
})
export class StartPage implements OnInit {
  readonly formValidated = signal(false);
  readonly peopleCount: Signal<number>;
  readonly timeAvailable: Signal<string>;

  readonly form: FormGroup<{
    peopleCount: FormControl<string>;
    timeAvailable: FormControl<string>;
  }>;

  readonly peopleCountOptions = [
    PEOPLE_COUNT_PLACEHOLDER,
    ...Array.from({ length: MAX_PEOPLE_COUNT }, (_, i) => `${i + 1}`),
  ];

  private previousPeopleCount = 0;
  private readonly peopleCountValue: Signal<string>;
  private readonly timeAvailableValue: Signal<string>;

  constructor(
    private readonly pollStateService: PollStateService,
    private readonly formBuilder: FormBuilder,
    private readonly router: Router
  ) {
    this.peopleCount = this.pollStateService.peopleCount;
    this.timeAvailable = this.pollStateService.timeAvailable;

    this.form = this.formBuilder.nonNullable.group({
      peopleCount: ['', Validators.required],
      timeAvailable: ['', Validators.required],
    });

    this.peopleCountValue = toSignal(this.form.controls.peopleCount.valueChanges, {
      initialValue: '',
    });

    this.timeAvailableValue = toSignal(this.form.controls.timeAvailable.valueChanges, {
      initialValue: '',
    });

    this.setupFormEffects();
  }

  ngOnInit(): void {
    const currentPeopleCount = this.peopleCount();
    const currentTimeAvailable = this.timeAvailable();

    if (currentPeopleCount) {
      this.previousPeopleCount = currentPeopleCount;
      this.form.patchValue({
        peopleCount: currentPeopleCount.toString(),
        timeAvailable: currentTimeAvailable,
      });
    }
  }

  private setupFormEffects(): void {
    effect(() => {
      const newCount = +this.peopleCountValue();
      if (!newCount) {
        return;
      }

      if (this.previousPeopleCount && newCount !== this.previousPeopleCount) {
        this.pollStateService.resetPoll();
      }
      this.previousPeopleCount = newCount;
      this.pollStateService.setPeopleCount(newCount);
    });

    effect(() => {
      const time = this.timeAvailableValue();
      if (time) {
        this.pollStateService.setTimeAvailable(time);
      }
    });
  }

  onSubmit(): void {
    if (!this.form.valid) {
      this.formValidated.set(true);
      return;
    }

    this.router.navigate(['/poll']);
  }
}
