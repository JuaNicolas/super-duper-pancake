import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  provideRouter,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { GameService } from './core/services/game.service';
import { gamePath, routes } from './app.routes';

describe('Game navigation', () => {
  it('maps saved phases to resumable pages', () => {
    expect(gamePath(undefined)).toBe('/team-setup');
    expect(gamePath('deck-selection')).toBe('/deck-selection');
    expect(gamePath('playing')).toBe('/gameplay');
    expect(gamePath('round-summary')).toBe('/round-summary');
    expect(gamePath('finished')).toBe('/final-results');
  });

  it('guards gameplay against missing or incompatible progress', () => {
    const state = vi.fn().mockReturnValue(null);
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), { provide: GameService, useValue: { state } }],
    });
    const guard = routes.find((route) => route.path === 'gameplay')!
      .canActivate![0] as CanActivateFn;
    const check = () =>
      TestBed.runInInjectionContext(() =>
        guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
      );
    const router = TestBed.inject(Router);
    expect(router.serializeUrl(check() as ReturnType<Router['createUrlTree']>)).toBe('/team-setup');
    state.mockReturnValue({ phase: 'round-summary' });
    expect(router.serializeUrl(check() as ReturnType<Router['createUrlTree']>)).toBe(
      '/round-summary',
    );
    state.mockReturnValue({ phase: 'playing' });
    expect(check()).toBe(true);
  });
});
