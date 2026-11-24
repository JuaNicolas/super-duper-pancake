import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { GameService } from './core/services/game.service';
import { GameState } from './core/models/game.models';

export const gamePath = (phase: GameState['phase'] | undefined): string => {
  switch (phase) {
    case 'deck-selection':
      return '/deck-selection';
    case 'playing':
      return '/gameplay';
    case 'round-summary':
      return '/round-summary';
    case 'finished':
      return '/final-results';
    default:
      return '/team-setup';
  }
};

const inPhase =
  (phase: GameState['phase']): CanActivateFn =>
  () => {
    const state = inject(GameService).state();
    return state?.phase === phase || inject(Router).createUrlTree([gamePath(state?.phase)]);
  };

export const routes: Routes = [
  {
    path: '',
    title: 'Party Cards',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'team-setup',
    title: 'Team setup · Party Cards',
    loadComponent: () => import('./pages/team-setup/team-setup').then((m) => m.TeamSetup),
  },
  {
    path: 'deck-selection',
    title: 'Select a deck · Party Cards',
    canActivate: [inPhase('deck-selection')],
    loadComponent: () =>
      import('./pages/deck-selection/deck-selection').then((m) => m.DeckSelection),
  },
  {
    path: 'decks',
    title: 'Manage decks · Party Cards',
    loadComponent: () =>
      import('./pages/deck-management/deck-management').then((m) => m.DeckManagement),
  },
  {
    path: 'gameplay',
    title: 'Play · Party Cards',
    canActivate: [inPhase('playing')],
    loadComponent: () => import('./pages/gameplay/gameplay').then((m) => m.Gameplay),
  },
  {
    path: 'round-summary',
    title: 'Round summary · Party Cards',
    canActivate: [inPhase('round-summary')],
    loadComponent: () => import('./pages/round-summary/round-summary').then((m) => m.RoundSummary),
  },
  {
    path: 'final-results',
    title: 'Final results · Party Cards',
    canActivate: [inPhase('finished')],
    loadComponent: () => import('./pages/final-results/final-results').then((m) => m.FinalResults),
  },
  {
    path: 'rules',
    title: 'Rules · Party Cards',
    loadComponent: () => import('./pages/rules/rules').then((m) => m.Rules),
  },
  { path: '**', redirectTo: '' },
];
