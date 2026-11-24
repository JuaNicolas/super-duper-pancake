import { Injectable, inject, signal } from '@angular/core';
import { Deck } from '../models/game.models';
import { MAX_STORAGE_CHARACTERS, StorageService } from './storage.service';
import { validDeck } from './validation';

export const DECK_STORAGE_KEY = 'party-cards.decks.v1';

const BUILT_IN: Deck = {
  id: 'classic-characters',
  name: 'Party classics',
  builtIn: true,
  cards: [
    'Harry Potter',
    'Hermione Granger',
    'Darth Vader',
    'Yoda',
    'Princess Leia',
    'Luke Skywalker',
    'Spider-Man',
    'Batman',
    'Wonder Woman',
    'Superman',
    'Iron Man',
    'The Hulk',
    'Sherlock Holmes',
    'James Bond',
    'Indiana Jones',
    'Jack Sparrow',
    'Mary Poppins',
    'Mr Bean',
    'Shrek',
    'Donkey',
    'Elsa',
    'Olaf',
    'Simba',
    'Mufasa',
    'Mickey Mouse',
    'Minnie Mouse',
    'Donald Duck',
    'Bugs Bunny',
    'Scooby-Doo',
    'SpongeBob SquarePants',
    'Homer Simpson',
    'Marge Simpson',
    'Barbie',
    'Ken',
    'Mario',
    'Luigi',
    'Pikachu',
    'Sonic the Hedgehog',
    'Winnie the Pooh',
    'Paddington Bear',
    'Peter Pan',
    'Captain Hook',
    'Cinderella',
    'Snow White',
    'Little Red Riding Hood',
    'Robin Hood',
    'Dracula',
    'Frankenstein’s Monster',
    'Santa Claus',
    'The Tooth Fairy',
    'Albert Einstein',
    'Marie Curie',
    'Cleopatra',
    'Leonardo da Vinci',
    'William Shakespeare',
    'Frida Kahlo',
    'Vincent van Gogh',
    'Neil Armstrong',
    'Serena Williams',
    'Lionel Messi',
    'Beyoncé',
    'Taylor Swift',
    'Elvis Presley',
    'Freddie Mercury',
    'Charlie Chaplin',
    'The Little Mermaid',
    'Willy Wonka',
    'The Grinch',
    'Wednesday Addams',
    'Gandalf',
  ].map((name, index) => ({ id: `classic-${index + 1}`, name })),
};

@Injectable({ providedIn: 'root' })
export class DeckService {
  private readonly storage = inject(StorageService);
  private readonly decksValue = signal<Deck[]>([structuredClone(BUILT_IN)]);
  readonly decks = this.decksValue.asReadonly();

  constructor() {
    const saved = this.storage.read<unknown>(DECK_STORAGE_KEY);
    if (
      Array.isArray(saved) &&
      saved.length <= 50 &&
      saved.every((deck) => validDeck(deck) && !deck.builtIn && deck.id !== BUILT_IN.id) &&
      new Set(saved.map((deck) => deck.id)).size === saved.length
    ) {
      this.decksValue.set([structuredClone(BUILT_IN), ...saved]);
    } else if (saved !== null) {
      this.storage.remove(DECK_STORAGE_KEY);
    }
  }

  save(deck: Deck): void {
    if (!validDeck(deck))
      throw new Error('Invalid deck. Use unique cards with short names (maximum 1,000 cards).');
    if (deck.builtIn || deck.id === BUILT_IN.id)
      throw new Error('The built-in deck cannot be changed.');
    const existing = this.decksValue().filter((item) => item.id !== deck.id);
    if (existing.length >= 51) throw new Error('You can store at most 50 custom decks.');
    const next = [...existing, { ...structuredClone(deck), builtIn: false }];
    if (JSON.stringify(next.filter((item) => !item.builtIn)).length > MAX_STORAGE_CHARACTERS)
      throw new Error(
        'Your deck collection is too large to save. Remove some decks or cards first.',
      );
    this.decksValue.set(next);
    this.persist();
  }

  delete(id: string): void {
    if (id === BUILT_IN.id) throw new Error('The built-in deck cannot be deleted.');
    this.decksValue.set(this.decksValue().filter((deck) => deck.id !== id));
    this.persist();
  }

  importJson(json: string): void {
    if (typeof json !== 'string' || json.length > 300_000)
      throw new Error('The deck file is too large.');
    let value: unknown;
    try {
      value = JSON.parse(json);
    } catch {
      throw new Error('The deck file is not valid JSON.');
    }
    if (!validDeck(value)) throw new Error('The deck file has an invalid format.');
    this.save(value);
  }

  exportJson(id: string): string {
    const deck = this.decksValue().find((item) => item.id === id);
    if (!deck) throw new Error('Deck not found.');
    // Exports are portable custom decks, including when based on the built-in deck.
    return JSON.stringify(
      {
        id: deck.builtIn ? crypto.randomUUID() : deck.id,
        name: deck.name,
        cards: deck.cards,
      },
      null,
      2,
    );
  }

  private persist(): void {
    this.storage.write(
      DECK_STORAGE_KEY,
      this.decksValue().filter((deck) => !deck.builtIn),
    );
  }
}
