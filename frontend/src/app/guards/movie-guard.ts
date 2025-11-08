import { inject } from '@angular/core/primitives/di';
import { CanActivateFn, Router } from '@angular/router';
import { PollStateService } from '../services/poll-state.service';

export const movieGuard: CanActivateFn = () => {
  const pollStateService = inject(PollStateService);
  const router = inject(Router);

  if (!pollStateService.peopleCount()) {
    router.navigate(['/']);
    return false;
  }

  if (!pollStateService.isPollCompleted()) {
    router.navigate(['/poll']);
    return false;
  }

  return true;
};
