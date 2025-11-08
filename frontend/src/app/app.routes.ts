import { Routes } from '@angular/router';
import { StartPage } from './pages/start-page/start-page';
import { MoviePage } from './pages/movie-page/movie-page';
import { PollPage } from './pages/poll-page/poll-page';
import { pollGuard } from './guards/poll-guard';
import { movieGuard } from './guards/movie-guard';

export const routes: Routes = [
  {
    path: '',
    component: StartPage,
  },
  {
    path: 'poll',
    component: PollPage,
    canActivate: [pollGuard],
  },
  {
    path: 'movie',
    component: MoviePage,
    canActivate: [movieGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
