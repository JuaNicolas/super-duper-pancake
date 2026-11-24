import { vi } from 'vitest';
import { StorageService } from './storage.service';

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
    localStorage.setItem('test', ' '.repeat(2_000_001));
    expect(storage.read('test')).toBeNull();
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
