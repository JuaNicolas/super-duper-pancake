import { CharacterCard, Deck, Team } from '../models/game.models';

export function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function text(value: unknown, limit = 100): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= limit;
}

export function unique(values: string[]): boolean {
  return new Set(values).size === values.length;
}

export function validCards(value: unknown, minimum = 1, maximum = 1000): value is CharacterCard[] {
  return (
    Array.isArray(value) &&
    value.length >= minimum &&
    value.length <= maximum &&
    value.every(
      (card) =>
        record(card) &&
        Object.keys(card).every((key) => ['id', 'name'].includes(key)) &&
        text(card['id']) &&
        text(card['name'], 120),
    ) &&
    unique(value.map((card) => card.id)) &&
    unique(value.map((card) => card.name.trim().toLocaleLowerCase()))
  );
}

export function validDeck(value: unknown): value is Deck {
  return (
    record(value) &&
    Object.keys(value).every((key) => ['id', 'name', 'cards', 'builtIn'].includes(key)) &&
    text(value['id']) &&
    text(value['name'], 120) &&
    validCards(value['cards']) &&
    (value['builtIn'] === undefined || typeof value['builtIn'] === 'boolean')
  );
}

export function validTeams(value: unknown): value is Team[] {
  if (!Array.isArray(value) || value.length !== 2) return false;
  if (
    !value.every(
      (team) =>
        record(team) &&
        Object.keys(team).every((key) => ['id', 'name', 'players'].includes(key)) &&
        text(team['id']) &&
        text(team['name'], 80) &&
        Array.isArray(team['players']) &&
        team['players'].length >= 2 &&
        team['players'].length <= 50 &&
        team['players'].every(
          (player) =>
            record(player) &&
            Object.keys(player).every((key) => ['id', 'name'].includes(key)) &&
            text(player['id']) &&
            text(player['name'], 80),
        ),
    )
  ) {
    return false;
  }
  const teams = value as Team[];
  return (
    unique(teams.map((team) => team.id)) &&
    unique(teams.flatMap((team) => team.players.map((player) => player.id))) &&
    Math.abs(teams[0].players.length - teams[1].players.length) <= 1
  );
}
