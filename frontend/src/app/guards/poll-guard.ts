import { inject } from '@angular/core/primitives/di';
import { CanActivateFn, Router } from '@angular/router';
import { PollStateService } from '../services/poll-state.service';

export const pollGuard: CanActivateFn = () => {
  const pollStateService = inject(PollStateService);
  const router = inject(Router);

  if (!pollStateService.peopleCount()) {
    router.navigate(['/']);
    return false;
  }

  return true;
};
