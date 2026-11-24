import { Injectable, computed, inject, signal } from '@angular/core';
import { CharacterCard, Deck, GameState, Round, Team } from '../models/game.models';
import { StorageService } from './storage.service';
import { TimerService } from './timer.service';
import { TurnSoundService } from './turn-sound.service';
import { TURN_DURATION_MS, validGameState } from './game-state.validation';
import { validDeck, validTeams } from './validation';

export const GAME_STORAGE_KEY = 'party-cards.game.v1';

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly storage = inject(StorageService);
  private readonly timer = inject(TimerService);
  private readonly turnSound = inject(TurnSoundService);
  private readonly stateValue = signal<GameState | null>(null);
  readonly state = this.stateValue.asReadonly();
  private readonly timeUpValue = signal(false);
  readonly timeUp = this.timeUpValue.asReadonly();
  readonly currentCard = computed<CharacterCard | null>(() => {
    const state = this.state();
    return state?.deck.find((card) => card.id === state.currentCardId) ?? null;
  });
  readonly activeTeam = computed(() => {
    const state = this.state();
    return state?.teams[state.activeTeamIndex] ?? null;
  });
  readonly activePlayer = computed(() => {
    const state = this.state();
    return (
      state?.teams[state.activeTeamIndex]?.players[state.playerIndices[state.activeTeamIndex]] ??
      null
    );
  });
  readonly scores = computed(() => {
    const state = this.state();
    if (!state) return [];
    const turns = state.turn ? [...state.turns, state.turn] : state.turns;
    return state.teams.map((team) => {
      const rounds = [1, 2, 3].map((round) =>
        turns
          .filter((turn) => turn.teamId === team.id && turn.round === round)
          .reduce((score, turn) => score + turn.correctCardIds.length, 0),
      );
      return {
        teamId: team.id,
        name: team.name,
        total: rounds.reduce((sum, score) => sum + score, 0),
        rounds,
      };
    });
  });
  readonly canPass = computed(() => {
    const state = this.state();
    return (
      !!state &&
      state.phase === 'playing' &&
      state.round > 1 &&
      state.turn !== null &&
      this.timer.running() &&
      this.timer.remaining() > 0
    );
  });

  constructor() {
    const saved = this.storage.read<unknown>(GAME_STORAGE_KEY);
    if (validGameState(saved)) {
      this.stateValue.set(saved);
      if (saved.turn) this.resumeTimer(saved.turn.id, saved.turn.endsAt);
    } else if (saved !== null) {
      this.storage.remove(GAME_STORAGE_KEY);
    }
  }

  newGame(): void {
    this.timer.stop();
    this.dismissTimeUp();
    this.commit({
      phase: 'setup',
      teams: [],
      deck: [],
      remainingCardIds: [],
      currentCardId: null,
      round: 1,
      activeTeamIndex: 0,
      playerIndices: [],
      turn: null,
      turns: [],
    });
  }

  setupTeams(teams: Team[]): void {
    const state = this.requireState();
    if (!['setup', 'deck-selection'].includes(state.phase))
      throw new Error('Start a new game before changing teams.');
    if (!validTeams(teams))
      throw new Error(
        'Use exactly two teams with at least two players each, balanced within one player, with unique IDs.',
      );
    this.commit({
      ...state,
      phase: 'deck-selection',
      teams: structuredClone(teams),
      playerIndices: [0, 0],
    });
  }

  startGame(deck: Deck): void {
    const state = this.requireState();
    if (state.phase !== 'deck-selection') throw new Error('Set up your teams first.');
    if (!validDeck(deck) || deck.cards.length < 50)
      throw new Error('Choose a deck with at least 50 unique cards.');
    const cards = shuffle(structuredClone(deck.cards)).slice(0, 50);
    this.commit({
      ...state,
      phase: 'playing',
      deck: cards,
      remainingCardIds: cards.map((card) => card.id),
    });
  }

  startTurn(): void {
    const state = this.requireState();
    if (state.turn) {
      this.expireIfNeeded();
      return;
    }
    if (state.phase !== 'playing') throw new Error('A turn cannot start now.');
    this.dismissTimeUp();
    const team = state.teams[state.activeTeamIndex];
    const startedAt = Date.now();
    const turn = {
      id: crypto.randomUUID(),
      teamId: team.id,
      playerId: team.players[state.playerIndices[state.activeTeamIndex]].id,
      round: state.round,
      correctCardIds: [],
      passedCardIds: [],
      startedAt,
      endsAt: startedAt + TURN_DURATION_MS,
    };
    this.commit({ ...state, turn, currentCardId: state.remainingCardIds[0] });
    this.resumeTimer(turn.id, turn.endsAt);
  }

  correct(): void {
    if (this.expireIfNeeded()) return;
    const state = this.requireActiveTurn();
    const id = state.currentCardId!;
    const remainingCardIds = state.remainingCardIds.filter((cardId) => cardId !== id);
    const next = {
      ...state,
      remainingCardIds,
      currentCardId: remainingCardIds[0] ?? null,
      turn: { ...state.turn!, correctCardIds: [...state.turn!.correctCardIds, id] },
    };
    if (remainingCardIds.length === 0) this.finishTurn(next);
    else this.commit(next);
  }

  pass(): void {
    if (this.expireIfNeeded()) return;
    const state = this.requireActiveTurn();
    if (state.round === 1) throw new Error('Passing is only allowed in rounds 2 and 3.');
    const id = state.currentCardId!;
    const remainingCardIds = [...state.remainingCardIds.filter((cardId) => cardId !== id), id];
    this.commit({
      ...state,
      remainingCardIds,
      currentCardId: remainingCardIds[0],
      turn: { ...state.turn!, passedCardIds: [...state.turn!.passedCardIds, id] },
    });
  }

  endTurn(): void {
    const state = this.requireState();
    if (!state.turn) return;
    if (this.expireIfNeeded()) return;
    this.finishTurn(state);
  }

  dismissTimeUp(): void {
    this.timeUpValue.set(false);
  }

  nextRound(): void {
    const state = this.requireState();
    if (state.phase !== 'round-summary' || state.round >= 3)
      throw new Error('There is no next round yet.');
    this.timer.stop();
    this.commit({
      ...state,
      phase: 'playing',
      round: (state.round + 1) as Round,
      remainingCardIds: shuffle(state.deck.map((card) => card.id)),
      currentCardId: null,
    });
  }

  private resumeTimer(turnId: string, deadline: number): void {
    this.timer.start(deadline, () => {
      const state = this.state();
      if (state?.turn?.id === turnId) this.finishTurn(state, true);
    });
  }

  private expireIfNeeded(): boolean {
    const state = this.state();
    if (state?.turn && Date.now() >= state.turn.endsAt) {
      this.finishTurn(state, true);
      return true;
    }
    return false;
  }

  private finishTurn(state: GameState, timeExpired = false): void {
    const turn = state.turn!;
    this.timer.stop();
    const playerIndices = [...state.playerIndices];
    playerIndices[state.activeTeamIndex] =
      (playerIndices[state.activeTeamIndex] + 1) %
      state.teams[state.activeTeamIndex].players.length;
    this.commit({
      ...state,
      turn: null,
      currentCardId: null,
      playerIndices,
      activeTeamIndex: (state.activeTeamIndex + 1) % 2,
      turns: [
        ...state.turns,
        { ...turn, endedAt: Math.max(turn.startedAt, Math.min(Date.now(), turn.endsAt)) },
      ],
      phase: state.remainingCardIds.length
        ? 'playing'
        : state.round === 3
          ? 'finished'
          : 'round-summary',
    });
    if (timeExpired) {
      this.timeUpValue.set(true);
      this.turnSound.play();
    }
  }

  private requireState(): GameState {
    const state = this.state();
    if (!state) throw new Error('Start a new game first.');
    return state;
  }

  private requireActiveTurn(): GameState {
    const state = this.requireState();
    if (state.phase !== 'playing' || !state.turn || !state.currentCardId)
      throw new Error('Start a turn first.');
    return state;
  }

  private commit(state: GameState): void {
    this.stateValue.set(state);
    this.storage.write(GAME_STORAGE_KEY, state);
  }
}

function shuffle<T>(items: T[]): T[] {
  for (let index = items.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [items[index], items[other]] = [items[other], items[index]];
  }
  return items;
}
