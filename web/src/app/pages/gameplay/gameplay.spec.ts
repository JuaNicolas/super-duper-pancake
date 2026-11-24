import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GameState } from '../../core/models/game.models';
import { GameService } from '../../core/services/game.service';
import { TimerService } from '../../core/services/timer.service';
import { TurnSoundService } from '../../core/services/turn-sound.service';
import { Gameplay } from './gameplay';

describe('Gameplay controls', () => {
  const initialState: GameState = {
    phase: 'playing',
    teams: [{ id: 'team', name: 'Team', players: [{ id: 'player', name: 'Player' }] }],
    deck: [{ id: 'card', name: 'Character' }],
    remainingCardIds: ['card'],
    currentCardId: 'card',
    round: 2,
    activeTeamIndex: 0,
    playerIndices: [0],
    turn: {
      id: 'turn',
      teamId: 'team',
      playerId: 'player',
      round: 2,
      correctCardIds: [],
      passedCardIds: [],
      startedAt: 0,
      endsAt: 60000,
    },
    turns: [],
  };
  let state: ReturnType<typeof signal<GameState>>;
  let running: ReturnType<typeof signal<boolean>>;
  let game: {
    state: typeof state;
    activeTeam: () => GameState['teams'][number];
    activePlayer: () => GameState['teams'][number]['players'][number];
    currentCard: () => GameState['deck'][number];
    canPass: () => boolean;
    scores: () => [];
    correct: ReturnType<typeof vi.fn>;
    pass: ReturnType<typeof vi.fn>;
    endTurn: ReturnType<typeof vi.fn>;
    startTurn: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    state = signal(structuredClone(initialState));
    running = signal(true);
    game = {
      state,
      activeTeam: () => state().teams[0],
      activePlayer: () => state().teams[0].players[0],
      currentCard: () => state().deck[0],
      canPass: () => state().round > 1 && running(),
      scores: () => [],
      correct: vi.fn(),
      pass: vi.fn(),
      endTurn: vi.fn(),
      startTurn: vi.fn(),
    };
    TestBed.configureTestingModule({
      imports: [Gameplay],
      providers: [
        provideRouter([]),
        { provide: GameService, useValue: game },
        { provide: TimerService, useValue: { running, remaining: signal(45) } },
      ],
    });
  });

  function touch(element: Element, type: string, x: number, y: number, count = 1): void {
    const point = { identifier: 1, clientX: x, clientY: y };
    const event = new Event(type, { bubbles: true });
    Object.defineProperties(event, {
      touches: {
        value: type === 'touchstart' || type === 'touchmove' ? Array(count).fill(point) : [],
      },
      changedTouches: { value: [point] },
    });
    element.dispatchEvent(event);
  }

  it('enables sound on start and offers to enable it for a restored turn', () => {
    const sound = TestBed.inject(TurnSoundService);
    const enable = vi.spyOn(sound, 'enable').mockImplementation(() => {});
    state.update((value) => ({ ...value, turn: null, currentCardId: null }));
    const fixture = TestBed.createComponent(Gameplay);
    fixture.detectChanges();
    const start = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.includes('Start 60-second turn'));
    expect(start).toBeDefined();
    start!.click();
    expect(enable).toHaveBeenCalledOnce();
    expect(game.startTurn).toHaveBeenCalledOnce();
    state.set(structuredClone(initialState));
    fixture.detectChanges();
    const retry = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.includes('Enable sound'));
    expect(retry).toBeDefined();
    retry!.click();
    expect(enable).toHaveBeenCalledTimes(2);
  });

  it('provides buttons and optional directional swipes', () => {
    const fixture = TestBed.createComponent(Gameplay);
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('.swipe-card') as Element;
    const buttons = fixture.nativeElement.querySelectorAll(
      '.turn-actions button',
    ) as NodeListOf<HTMLButtonElement>;
    buttons[0].click();
    buttons[1].click();
    touch(card, 'touchstart', 100, 100);
    touch(card, 'touchend', 180, 110);
    touch(card, 'touchstart', 100, 100);
    touch(card, 'touchend', 20, 110);
    expect(game.correct).toHaveBeenCalledTimes(2);
    expect(game.pass).toHaveBeenCalledTimes(2);
  });

  it('does not pass in round one, including by swiping', () => {
    state.update((value) => ({ ...value, round: 1 }));
    const fixture = TestBed.createComponent(Gameplay);
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('.swipe-card') as Element;
    const pass = fixture.nativeElement.querySelector('.turn-actions button') as HTMLButtonElement;
    expect(pass.disabled).toBe(true);
    touch(card, 'touchstart', 100, 100);
    touch(card, 'touchend', 0, 100);
    expect(game.pass).not.toHaveBeenCalled();
  });

  it('moves and labels the card while dragging, then snaps back for a short swipe', () => {
    const fixture = TestBed.createComponent(Gameplay);
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('.swipe-card') as HTMLElement;
    touch(card, 'touchstart', 100, 100);
    touch(card, 'touchmove', 140, 105);
    fixture.detectChanges();
    expect(card.style.transform).toContain('translateX(40px)');
    expect(card.textContent).toContain('Swipe for Correct +1');
    expect(game.correct).not.toHaveBeenCalled();
    touch(card, 'touchmove', 190, 105);
    fixture.detectChanges();
    expect(card.textContent).toContain('Release for Correct +1');
    touch(card, 'touchmove', 140, 105);
    touch(card, 'touchend', 140, 105);
    fixture.detectChanges();
    expect(card.style.transform).toContain('translateX(0px)');
    expect(card.classList.contains('snap-back')).toBe(true);
    expect(card.querySelector('.swipe-feedback')).toBeNull();
    expect(game.correct).not.toHaveBeenCalled();
  });

  it('shows pass feedback and explains when passing is unavailable', () => {
    const fixture = TestBed.createComponent(Gameplay);
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('.swipe-card') as HTMLElement;
    touch(card, 'touchstart', 100, 100);
    touch(card, 'touchmove', 10, 100);
    fixture.detectChanges();
    expect(card.textContent).toContain('Release for Pass');
    touch(card, 'touchcancel', 10, 100);
    state.update((value) => ({ ...value, round: 1 }));
    fixture.detectChanges();
    touch(card, 'touchstart', 100, 100);
    touch(card, 'touchmove', 10, 100);
    fixture.detectChanges();
    expect(card.textContent).toContain('Passing not allowed');
    touch(card, 'touchend', 10, 100);
    fixture.detectChanges();
    expect(card.style.transform).toContain('translateX(0px)');
    expect(card.classList.contains('snap-back')).toBe(true);
    expect(game.pass).not.toHaveBeenCalled();
  });

  it('resets feedback without snapping the next card back after a successful swipe', () => {
    const fixture = TestBed.createComponent(Gameplay);
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('.swipe-card') as HTMLElement;
    touch(card, 'touchstart', 100, 100);
    touch(card, 'touchmove', 200, 100);
    fixture.detectChanges();
    touch(card, 'touchend', 200, 100);
    fixture.detectChanges();
    expect(game.correct).toHaveBeenCalledOnce();
    expect(card.style.transform).toContain('translateX(0px)');
    expect(card.classList.contains('snap-back')).toBe(false);
    expect(card.querySelector('.swipe-feedback')).toBeNull();
  });

  it('ignores short, vertical, cancelled and multi-touch gestures', () => {
    const fixture = TestBed.createComponent(Gameplay);
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('.swipe-card') as Element;
    touch(card, 'touchstart', 100, 100);
    touch(card, 'touchend', 160, 100);
    touch(card, 'touchstart', 100, 100);
    touch(card, 'touchend', 180, 200);
    touch(card, 'touchstart', 100, 100);
    touch(card, 'touchcancel', 100, 100);
    touch(card, 'touchend', 200, 100);
    touch(card, 'touchstart', 100, 100, 2);
    touch(card, 'touchend', 200, 100);
    expect(game.correct).not.toHaveBeenCalled();
    expect(game.pass).not.toHaveBeenCalled();
  });

  it('ignores a swipe if the timer stops or the card or turn changes', () => {
    const fixture = TestBed.createComponent(Gameplay);
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('.swipe-card') as Element;
    touch(card, 'touchstart', 100, 100);
    running.set(false);
    touch(card, 'touchend', 200, 100);
    running.set(true);
    touch(card, 'touchstart', 100, 100);
    state.update((value) => ({ ...value, currentCardId: 'another-card' }));
    touch(card, 'touchend', 200, 100);
    touch(card, 'touchstart', 100, 100);
    state.update((value) => ({ ...value, turn: { ...value.turn!, id: 'another-turn' } }));
    touch(card, 'touchend', 200, 100);
    expect(game.correct).not.toHaveBeenCalled();
  });
});
