import { vi } from 'vitest';
import { MAX_STORAGE_CHARACTERS, StorageService } from './storage.service';

describe('StorageService', () => {
  const storage = new StorageService();

  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('reads, writes and removes JSON records', () => {
    expect(storage.read('missing')).toBeNull();
    storage.write('test', { cards: [1, 2] });
    expect(storage.read('test')).toEqual({ cards: [1, 2] });
    storage.remove('test');
    expect(storage.read('test')).toBeNull();
  });

  it('returns null for malformed or oversized records', () => {
    localStorage.setItem('test', '{broken');
    expect(storage.read('test')).toBeNull();
    localStorage.setItem('test', ' '.repeat(MAX_STORAGE_CHARACTERS + 1));
    expect(storage.read('test')).toBeNull();
  });

  it('writes readable records at the size limit and preserves them when oversized writes are skipped', () => {
    const boundary = 'a'.repeat(MAX_STORAGE_CHARACTERS - 2);
    storage.write('test', boundary);
    expect(localStorage.getItem('test')!.length).toBe(MAX_STORAGE_CHARACTERS);
    expect(storage.read('test')).toBe(boundary);
    expect(() => storage.write('test', `${boundary}a`)).not.toThrow();
    expect(storage.read('test')).toBe(boundary);
    storage.write('missing', `${boundary}a`);
    expect(localStorage.getItem('missing')).toBeNull();
  });

  it('handles blocked access and quota errors without breaking the game', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(storage.read('test')).toBeNull();
    expect(() => storage.write('test', {})).not.toThrow();
    expect(() => storage.remove('test')).not.toThrow();
  });
});
