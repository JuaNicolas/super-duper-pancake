import { TestBed } from '@angular/core/testing';
import { Deck } from '../models/game.models';
import { DECK_STORAGE_KEY, DeckService } from './deck.service';
import { StorageService } from './storage.service';

describe('DeckService', () => {
  let service: DeckService;
  const deck: Deck = {
    id: 'custom',
    name: 'My deck',
    cards: [{ id: 'one', name: 'Sherlock Holmes' }],
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeckService);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('includes a varied built-in deck and protects it from editing and deletion', () => {
    const builtIn = service.decks()[0];
    expect(builtIn.builtIn).toBe(true);
    expect(builtIn.cards.length).toBeGreaterThanOrEqual(50);
    expect(new Set(builtIn.cards.map((card) => card.name)).size).toBe(builtIn.cards.length);
    expect(() => service.delete(builtIn.id)).toThrow();
    expect(() => service.save({ ...builtIn, builtIn: false })).toThrow();
  });

  it('upserts and deletes custom decks, persists and round-trips exports', () => {
    service.save(deck);
    service.save({ ...deck, name: 'Updated' });
    expect(service.decks()).toHaveLength(2);
    const exported = service.exportJson(deck.id);
    service.delete(deck.id);
    expect(service.decks()).toHaveLength(1);
    service.importJson(exported);
    const restored = TestBed.runInInjectionContext(() => new DeckService());
    expect(restored.decks()[1].name).toBe('Updated');
    expect(() => service.exportJson('missing')).toThrow();
  });

  it('exports built-in decks as importable custom decks with new IDs', () => {
    const exported = service.exportJson(service.decks()[0].id);
    service.importJson(exported);
    expect(service.decks()).toHaveLength(2);
    expect(service.decks()[1].builtIn).toBe(false);
    expect(service.decks()[1].id).not.toBe(service.decks()[0].id);
  });

  it.each([
    'not JSON',
    'null',
    '[]',
    '{}',
    JSON.stringify({ ...deck, name: ' ' }),
    JSON.stringify({ ...deck, builtIn: 'false' }),
    JSON.stringify({ ...deck, cards: [] }),
    JSON.stringify({ ...deck, cards: [deck.cards[0], deck.cards[0]] }),
    JSON.stringify({ ...deck, cards: [deck.cards[0], { id: 'two', name: ' SHERLOCK HOLMES ' }] }),
    JSON.stringify({ ...deck, cards: [{ id: 'one', name: 'a'.repeat(121) }] }),
    JSON.stringify({ ...deck, cards: [{ id: 'one', name: {} }] }),
    JSON.stringify({ ...deck, cards: [{ id: 'one', name: 'Valid', payload: {} }] }),
    JSON.stringify({ ...deck, extra: 'not accepted' }),
    '{"id":"custom","name":"Bad","cards":[{"id":"one","name":"One"}],"__proto__":{"polluted":true}}',
    ' '.repeat(300_001),
    JSON.stringify({
      ...deck,
      cards: Array.from({ length: 1001 }, (_, i) => ({ id: `c${i}`, name: `Name ${i}` })),
    }),
  ])('rejects unsafe or malformed imports without changing decks (%#)', (json) => {
    expect(() => service.importJson(json)).toThrow();
    expect(service.decks()).toHaveLength(1);
    expect(Object.prototype).not.toHaveProperty('polluted');
  });

  it('discards invalid stored decks and never lets storage replace the built-in deck', () => {
    const storage = TestBed.inject(StorageService);
    storage.write(DECK_STORAGE_KEY, [{ ...deck, id: service.decks()[0].id }]);
    expect(TestBed.runInInjectionContext(() => new DeckService()).decks()).toHaveLength(1);
    expect(storage.read(DECK_STORAGE_KEY)).toBeNull();
  });

  it('bounds the number of custom decks while allowing updates at capacity', () => {
    for (let index = 0; index < 50; index++) service.save({ ...deck, id: `deck-${index}` });
    expect(() => service.save(deck)).toThrow('at most 50');
    expect(() => service.save({ ...deck, id: 'deck-0', name: 'Updated' })).not.toThrow();
  });
});
