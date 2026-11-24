export interface Player {
  id: string;
  name: string;
}

export interface Team {
  id: string;
  name: string;
  players: Player[];
}

export interface CharacterCard {
  id: string;
  name: string;
}

export interface Deck {
  id: string;
  name: string;
  cards: CharacterCard[];
  builtIn?: boolean;
}

export type Round = 1 | 2 | 3;

export interface Turn {
  id: string;
  teamId: string;
  playerId: string;
  round: Round;
  correctCardIds: string[];
  passedCardIds: string[];
  startedAt: number;
  endsAt: number;
  endedAt?: number;
}

export interface GameState {
  phase: 'setup' | 'deck-selection' | 'playing' | 'round-summary' | 'finished';
  teams: Team[];
  deck: CharacterCard[];
  remainingCardIds: string[];
  currentCardId: string | null;
  round: Round;
  activeTeamIndex: number;
  playerIndices: number[];
  turn: Turn | null;
  turns: Turn[];
}
