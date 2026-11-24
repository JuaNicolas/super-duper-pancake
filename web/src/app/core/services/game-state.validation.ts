import { GameState, Turn } from '../models/game.models';
import { record, text, unique, validCards, validTeams } from './validation';

export const TURN_DURATION_MS = 60_000;

export function validGameState(value: unknown): value is GameState {
  if (
    !record(value) ||
    Object.keys(value).some(
      (key) =>
        ![
          'phase',
          'teams',
          'deck',
          'remainingCardIds',
          'currentCardId',
          'round',
          'activeTeamIndex',
          'playerIndices',
          'turn',
          'turns',
        ].includes(key),
    )
  )
    return false;
  if (
    !['setup', 'deck-selection', 'playing', 'round-summary', 'finished'].includes(
      value['phase'] as string,
    ) ||
    ![1, 2, 3].includes(value['round'] as number) ||
    !Array.isArray(value['deck']) ||
    !Array.isArray(value['teams']) ||
    !Array.isArray(value['remainingCardIds']) ||
    !Array.isArray(value['playerIndices']) ||
    !Array.isArray(value['turns']) ||
    value['turns'].length > 20_000 ||
    !(value['currentCardId'] === null || text(value['currentCardId'])) ||
    !(value['turn'] === null || record(value['turn']))
  )
    return false;

  const state = value as unknown as GameState;
  if (state.phase === 'setup' || state.phase === 'deck-selection') {
    return (
      state.round === 1 &&
      state.activeTeamIndex === 0 &&
      state.deck.length === 0 &&
      state.remainingCardIds.length === 0 &&
      state.currentCardId === null &&
      state.turn === null &&
      state.turns.length === 0 &&
      (state.phase === 'setup'
        ? state.teams.length === 0 && state.playerIndices.length === 0
        : validTeams(state.teams) &&
          state.playerIndices.length === 2 &&
          state.playerIndices.every((index) => index === 0))
    );
  }
  if (
    !validTeams(state.teams) ||
    !validCards(state.deck, 50, 50) ||
    ![0, 1].includes(state.activeTeamIndex) ||
    state.playerIndices.length !== 2 ||
    !state.playerIndices.every(
      (index, team) =>
        Number.isInteger(index) && index >= 0 && index < state.teams[team].players.length,
    ) ||
    !state.remainingCardIds.every((id) => text(id)) ||
    !unique(state.remainingCardIds)
  )
    return false;

  const deckIds = new Set(state.deck.map((card) => card.id));
  const scored = [new Set<string>(), new Set<string>(), new Set<string>()];
  const rotations = [0, 0];
  const turnIds = new Set<string>();
  let previousRound = 1;
  let previousEnd = 0;

  const checkTurn = (raw: unknown, active: boolean, teamIndex: number): raw is Turn => {
    if (
      !record(raw) ||
      Object.keys(raw).some(
        (key) =>
          ![
            'id',
            'teamId',
            'playerId',
            'round',
            'correctCardIds',
            'passedCardIds',
            'startedAt',
            'endsAt',
            'endedAt',
          ].includes(key),
      ) ||
      !text(raw['id']) ||
      turnIds.has(raw['id']) ||
      ![1, 2, 3].includes(raw['round'] as number) ||
      typeof raw['startedAt'] !== 'number' ||
      !Number.isSafeInteger(raw['startedAt']) ||
      raw['startedAt'] < previousEnd ||
      raw['startedAt'] > Date.now() ||
      typeof raw['endsAt'] !== 'number' ||
      raw['endsAt'] !== raw['startedAt'] + TURN_DURATION_MS ||
      !Array.isArray(raw['correctCardIds']) ||
      !Array.isArray(raw['passedCardIds']) ||
      raw['correctCardIds'].length > 50 ||
      raw['passedCardIds'].length > 10_000 ||
      !raw['correctCardIds'].every((id) => typeof id === 'string' && deckIds.has(id)) ||
      !raw['passedCardIds'].every((id) => typeof id === 'string' && deckIds.has(id)) ||
      !unique(raw['correctCardIds']) ||
      (raw['round'] === 1 && raw['passedCardIds'].length > 0)
    )
      return false;
    const turn = raw as unknown as Turn;
    const team = state.teams[teamIndex];
    if (
      turn.teamId !== team.id ||
      turn.playerId !== team.players[rotations[teamIndex] % team.players.length].id ||
      turn.round < previousRound ||
      turn.round > previousRound + 1 ||
      turn.round > state.round ||
      (turn.round > previousRound && scored[previousRound - 1].size !== 50)
    )
      return false;
    if (
      active
        ? turn.endedAt !== undefined
        : !Number.isSafeInteger(turn.endedAt) ||
          turn.endedAt! < turn.startedAt ||
          turn.endedAt! > turn.endsAt ||
          turn.endedAt! > Date.now()
    )
      return false;
    const roundScores = scored[turn.round - 1];
    if (
      roundScores.size === 50 ||
      turn.correctCardIds.some((id) => roundScores.has(id)) ||
      turn.passedCardIds.some((id) => roundScores.has(id))
    )
      return false;
    turn.correctCardIds.forEach((id) => roundScores.add(id));
    turnIds.add(turn.id);
    previousRound = turn.round;
    if (!active) {
      rotations[teamIndex]++;
      previousEnd = turn.endedAt!;
    }
    return true;
  };

  for (let index = 0; index < state.turns.length; index++) {
    if (!checkTurn(state.turns[index], false, index % 2)) return false;
  }
  if (
    state.activeTeamIndex !== state.turns.length % 2 ||
    state.playerIndices.some(
      (index, team) => index !== rotations[team] % state.teams[team].players.length,
    )
  ) {
    return false;
  }
  if (state.turn !== null && !checkTurn(state.turn, true, state.activeTeamIndex)) return false;
  if (state.turn && state.turn.round !== state.round) return false;
  for (let round = 1; round < state.round; round++) {
    if (scored[round - 1].size !== 50) return false;
  }
  if (
    state.remainingCardIds.some((id) => !deckIds.has(id) || scored[state.round - 1].has(id)) ||
    state.remainingCardIds.length + scored[state.round - 1].size !== 50
  )
    return false;
  if (state.phase === 'playing') {
    return (
      state.remainingCardIds.length > 0 &&
      (state.turn
        ? state.currentCardId === state.remainingCardIds[0]
        : state.currentCardId === null)
    );
  }
  return (
    state.turn === null &&
    state.currentCardId === null &&
    state.remainingCardIds.length === 0 &&
    (state.phase === 'round-summary' ? state.round < 3 : state.round === 3)
  );
}
