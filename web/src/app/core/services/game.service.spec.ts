import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Deck, GameState, Team } from '../models/game.models';
import { GAME_STORAGE_KEY, GameService } from './game.service';
import { StorageService } from './storage.service';
import { TimerService } from './timer.service';
import { TurnSoundService } from './turn-sound.service';
import { TURN_DURATION_MS } from './game-state.validation';

const teams: Team[] = [
  {
    id: 'a',
    name: 'Team A',
    players: [
      { id: 'a1', name: 'Ada' },
      { id: 'a2', name: 'Alex' },
    ],
  },
  {
    id: 'b',
    name: 'Team B',
    players: [
      { id: 'b1', name: 'Ben' },
      { id: 'b2', name: 'Bea' },
    ],
  },
];
const deck: Deck = {
  id: 'test-deck',
  name: 'Test deck',
  cards: Array.from({ length: 60 }, (_, index) => ({
    id: `card-${index}`,
    name: `Character ${index}`,
  })),
};

describe('GameService', () => {
  let game: GameService;
  let storage: StorageService;
  let timer: TimerService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
    localStorage.clear();
    TestBed.configureTestingModule({});
    storage = TestBed.inject(StorageService);
    timer = TestBed.inject(TimerService);
    game = TestBed.inject(GameService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function ready(): void {
    game.newGame();
    game.setupTeams(teams);
    game.startGame(deck);
  }

  function reload(): GameService {
    return TestBed.runInInjectionContext(() => new GameService());
  }

  function finishRound(): void {
    game.startTurn();
    for (let index = 0; index < 50; index++) game.correct();
  }

  it('validates balanced, nonempty teams and requires 50 unique cards', () => {
    game.newGame();
    expect(() => game.setupTeams([])).toThrow();
    expect(() => game.setupTeams([{ ...teams[0], players: [] }, teams[1]])).toThrow();
    expect(() =>
      game.setupTeams([
        { ...teams[0], players: [teams[0].players[0]] },
        { ...teams[1], players: [teams[1].players[0]] },
      ]),
    ).toThrow();
    expect(() =>
      game.setupTeams([
        {
          ...teams[0],
          players: [...teams[0].players, { id: 'a3', name: 'Amy' }, { id: 'a4', name: 'Ari' }],
        },
        { ...teams[1], players: [teams[1].players[0]] },
      ]),
    ).toThrow();
    expect(() => game.setupTeams([teams[0], { ...teams[1], players: teams[0].players }])).toThrow();
    game.setupTeams(teams);
    expect(() => game.startGame({ ...deck, cards: deck.cards.slice(0, 49) })).toThrow();
    expect(() =>
      game.startGame({ ...deck, cards: [...deck.cards.slice(0, 49), deck.cards[0]] }),
    ).toThrow();
    game.startGame(deck);
    expect(game.state()!.deck).toHaveLength(50);
    expect(new Set(game.state()!.remainingCardIds).size).toBe(50);
    expect(game.currentCard()).toBeNull();
  });

  it('retains unsolved cards and alternates teams and rotates clue givers', () => {
    ready();
    game.startTurn();
    const solved = game.currentCard()!.id;
    game.correct();
    const unsolved = game.currentCard()!.id;
    expect(() => game.pass()).toThrow('Passing');
    game.endTurn();
    expect(game.state()!.remainingCardIds).toHaveLength(49);
    expect(game.state()!.remainingCardIds).not.toContain(solved);
    expect(game.state()!.remainingCardIds).toContain(unsolved);
    expect(game.activeTeam()!.id).toBe('b');
    expect(game.activePlayer()!.id).toBe('b1');
    game.startTurn();
    expect(game.currentCard()!.id).toBe(unsolved);
    game.endTurn();
    expect(game.activePlayer()!.id).toBe('a2');
    game.startTurn();
    game.endTurn();
    expect(game.activePlayer()!.id).toBe('b2');
    expect(game.scores().map((score) => score.total)).toEqual([1, 0]);
  });

  it('uses exactly the same 50 cards for all rounds and scores once per round', () => {
    const sound = vi.spyOn(TestBed.inject(TurnSoundService), 'play');
    ready();
    const fixed = game
      .state()!
      .deck.map((card) => card.id)
      .sort();
    finishRound();
    expect(game.state()!.phase).toBe('round-summary');
    expect(timer.running()).toBe(false);
    expect(game.scores()[0].rounds).toEqual([50, 0, 0]);
    expect(reload().state()!.phase).toBe('round-summary');
    game.nextRound();
    expect([...game.state()!.remainingCardIds].sort()).toEqual(fixed);
    expect(() => game.nextRound()).toThrow();
    finishRound();
    expect(game.scores()[1].rounds).toEqual([0, 50, 0]);
    game.nextRound();
    expect([...game.state()!.remainingCardIds].sort()).toEqual(fixed);
    finishRound();
    expect(game.state()!.phase).toBe('finished');
    expect(game.scores().map((score) => score.total)).toEqual([100, 50]);
    expect(timer.running()).toBe(false);
    expect(() => game.startTurn()).toThrow();
    expect(() => game.nextRound()).toThrow();
    expect(reload().state()!.phase).toBe('finished');
    expect(sound).not.toHaveBeenCalled();
  });

  it.each([2, 3])(
    'passing in round %i keeps a card without points and avoids immediate repeats',
    (round) => {
      ready();
      finishRound();
      game.nextRound();
      if (round === 3) {
        finishRound();
        game.nextRound();
      }
      game.startTurn();
      expect(game.canPass()).toBe(true);
      const passed = game.currentCard()!.id;
      const before = game.scores().map((score) => score.total);
      game.pass();
      expect(game.currentCard()!.id).not.toBe(passed);
      expect(game.state()!.remainingCardIds).toContain(passed);
      expect(game.state()!.turn!.passedCardIds).toEqual([passed]);
      expect(game.scores().map((score) => score.total)).toEqual(before);
      for (let index = 0; index < 49; index++) game.correct();
      expect(game.currentCard()!.id).toBe(passed);
      game.pass();
      expect(game.currentCard()!.id).toBe(passed);
      game.correct();
      expect(game.state()!.turn).toBeNull();
      expect(game.state()!.turns.at(-1)!.correctCardIds).toHaveLength(50);
    },
  );

  it('does not reset a turn through repeated start calls and rejects expired guesses before timer ticks', () => {
    const sound = vi.spyOn(TestBed.inject(TurnSoundService), 'play');
    ready();
    game.startTurn();
    const deadline = game.state()!.turn!.endsAt;
    vi.setSystemTime(Date.now() + 20_000);
    game.startTurn();
    expect(game.state()!.turn!.endsAt).toBe(deadline);
    vi.setSystemTime(deadline);
    game.correct();
    expect(game.state()!.turn).toBeNull();
    expect(game.timeUp()).toBe(true);
    expect(sound).toHaveBeenCalledOnce();
    expect(game.scores().map((score) => score.total)).toEqual([0, 0]);
    expect(game.state()!.turns).toHaveLength(1);
    expect(timer.running()).toBe(false);
    game.endTurn();
    expect(game.state()!.turns).toHaveLength(1);
  });

  it('expires pass actions too and automatically ends a running turn', () => {
    ready();
    game.startTurn();
    vi.advanceTimersByTime(60_000);
    expect(game.state()!.turn).toBeNull();
    expect(game.timeUp()).toBe(true);
    finishRound();
    game.nextRound();
    game.startTurn();
    vi.setSystemTime(game.state()!.turn!.endsAt);
    game.pass();
    expect(game.state()!.turn).toBeNull();
    expect(game.timeUp()).toBe(true);
    expect(game.state()!.turns.at(-1)!.passedCardIds).toEqual([]);
  });

  it('only alerts on timeout and clears the alert when dismissed or a new turn or game starts', () => {
    const sound = vi.spyOn(TestBed.inject(TurnSoundService), 'play');
    ready();
    game.startTurn();
    game.endTurn();
    expect(game.timeUp()).toBe(false);
    expect(sound).not.toHaveBeenCalled();
    game.startTurn();
    vi.advanceTimersByTime(TURN_DURATION_MS);
    expect(game.timeUp()).toBe(true);
    expect(sound).toHaveBeenCalledTimes(1);
    game.dismissTimeUp();
    expect(game.timeUp()).toBe(false);
    game.startTurn();
    vi.setSystemTime(game.state()!.turn!.endsAt);
    game.endTurn();
    expect(game.timeUp()).toBe(true);
    expect(sound).toHaveBeenCalledTimes(2);
    game.startTurn();
    expect(game.timeUp()).toBe(false);
    vi.advanceTimersByTime(TURN_DURATION_MS);
    expect(game.timeUp()).toBe(true);
    expect(sound).toHaveBeenCalledTimes(3);
    game.newGame();
    expect(game.timeUp()).toBe(false);
  });

  it('persists each mutation and resumes the original deadline across reloads', () => {
    const write = vi.spyOn(storage, 'write');
    ready();
    expect(write).toHaveBeenCalledTimes(3);
    game.startTurn();
    game.correct();
    const deadline = game.state()!.turn!.endsAt;
    vi.advanceTimersByTime(25_000);
    game = reload();
    expect(timer.remaining()).toBe(35);
    expect(game.state()!.turn!.endsAt).toBe(deadline);
    expect(game.scores()[0].total).toBe(1);
    vi.advanceTimersByTime(35_000);
    expect(game.state()!.turn).toBeNull();
    expect(storage.read<GameState>(GAME_STORAGE_KEY)).toEqual(game.state());
    expect(write).toHaveBeenCalledTimes(6);
  });

  it('immediately closes an already-expired restored turn without awarding points', () => {
    const sound = vi.spyOn(TestBed.inject(TurnSoundService), 'play');
    ready();
    game.startTurn();
    const deadline = game.state()!.turn!.endsAt;
    timer.stop();
    vi.setSystemTime(deadline + 30_000);
    game = reload();
    expect(game.state()!.turn).toBeNull();
    expect(game.timeUp()).toBe(true);
    expect(sound).toHaveBeenCalledOnce();
    expect(game.state()!.turns[0].endedAt).toBe(deadline);
    expect(game.activeTeam()!.id).toBe('b');
    expect(timer.running()).toBe(false);
  });

  it.each([
    (state: GameState) => {
      state.deck.pop();
    },
    (state: GameState) => {
      state.remainingCardIds.push(state.remainingCardIds[0]);
    },
    (state: GameState) => {
      state.currentCardId = 'missing';
    },
    (state: GameState) => {
      state.playerIndices[0] = 100;
    },
    (state: GameState) => {
      state.turn!.endsAt += 1;
    },
    (state: GameState) => {
      state.turn!.teamId = 'missing';
    },
    (state: GameState) => {
      state.turn!.playerId = 'missing';
    },
    (state: GameState) => {
      state.turn!.correctCardIds.push(state.remainingCardIds[0]);
    },
    (state: GameState) => {
      state.turn!.passedCardIds.push(state.remainingCardIds[0]);
    },
    (state: GameState) => {
      state.phase = 'finished';
    },
    (state: GameState) => {
      state.round = 3;
    },
    (state: GameState) => {
      state.turn!.endedAt = Date.now();
    },
  ])('discards inconsistent restored states (%#)', (corrupt) => {
    ready();
    game.startTurn();
    const saved = structuredClone(game.state()!);
    corrupt(saved);
    storage.write(GAME_STORAGE_KEY, saved);
    timer.stop();
    expect(reload().state()).toBeNull();
    expect(storage.read(GAME_STORAGE_KEY)).toBeNull();
  });

  it('rejects duplicate scoring and invalid history rotations on restore', () => {
    ready();
    game.startTurn();
    game.correct();
    game.endTurn();
    game.startTurn();
    const saved = structuredClone(game.state()!);
    saved.turn!.correctCardIds = [...saved.turns[0].correctCardIds];
    storage.write(GAME_STORAGE_KEY, saved);
    timer.stop();
    expect(reload().state()).toBeNull();
    saved.turn!.correctCardIds = [];
    saved.turns[0].playerId = 'a2';
    storage.write(GAME_STORAGE_KEY, saved);
    expect(reload().state()).toBeNull();
  });

  it.each([null, [], {}, { phase: 'playing' }, { phase: '__proto__' }])(
    'rejects malformed records: %j',
    (value) => {
      storage.write(GAME_STORAGE_KEY, value);
      expect(reload().state()).toBeNull();
    },
  );
});
