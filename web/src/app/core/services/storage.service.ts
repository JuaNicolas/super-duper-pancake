import { Injectable } from '@angular/core';

export const MAX_STORAGE_CHARACTERS = 2_000_000;

@Injectable({ providedIn: 'root' })
export class StorageService {
  read<T>(key: string): T | null {
    try {
      const raw = globalThis.localStorage?.getItem(key);
      if (!raw || raw.length > MAX_STORAGE_CHARACTERS) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  write(key: string, value: unknown): void {
    try {
      const serialized = JSON.stringify(value);
      if (serialized === undefined || serialized.length > MAX_STORAGE_CHARACTERS) return;
      globalThis.localStorage?.setItem(key, serialized);
    } catch {
      // Private browsing and full storage must not interrupt a live game.
    }
  }

  remove(key: string): void {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // Storage can be disabled by the browser.
    }
  }
}
