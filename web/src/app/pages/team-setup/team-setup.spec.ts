import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { GameService } from '../../core/services/game.service';
import { TeamSetup } from './team-setup';

describe('TeamSetup', () => {
  let component: TeamSetup;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: GameService,
          useValue: { state: () => null, newGame: vi.fn(), setupTeams: vi.fn() },
        },
      ],
    });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component = TestBed.runInInjectionContext(() => new TeamSetup());
  });

  function addPlayers(count: number): void {
    for (let index = 0; index < count; index++) {
      component.playerName = `Player ${index + 1}`;
      component.addPlayer();
    }
  }

  it('balances even and odd player counts without losing players', () => {
    addPlayers(5);
    component.balance();
    expect(component.teams().map((team) => team.players.length)).toEqual([3, 2]);
    expect(
      new Set(component.teams().flatMap((team) => team.players.map((player) => player.id))).size,
    ).toBe(5);
    component.removePlayer(component.players()[4].id);
    component.balance();
    expect(component.teams().map((team) => team.players.length)).toEqual([2, 2]);
  });

  it('rejects blank names and clears stale teams when the roster changes', () => {
    component.playerName = '   ';
    component.addPlayer();
    expect(component.players()).toEqual([]);
    expect(component.error()).not.toBe('');
    addPlayers(4);
    component.balance();
    component.playerName = 'Another player';
    component.addPlayer();
    expect(component.teams()).toEqual([]);
  });

  it('moves players but prevents continuing with unbalanced teams', () => {
    addPlayers(6);
    component.balance();
    component.movePlayer(component.teams()[0].players[0].id);
    expect(component.teams().map((team) => team.players.length)).toEqual([2, 4]);
    component.continue();
    expect(component.error()).toContain('Balance');
    expect(TestBed.inject(GameService).setupTeams).not.toHaveBeenCalled();
  });

  it('initializes a game when opening team setup directly', () => {
    addPlayers(4);
    component.balance();
    component.continue();
    expect(TestBed.inject(GameService).newGame).toHaveBeenCalledOnce();
    expect(TestBed.inject(GameService).setupTeams).toHaveBeenCalledWith(component.teams());
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/deck-selection']);
  });
});
