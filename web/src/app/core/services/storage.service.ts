import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StorageService {
  read<T>(key: string): T | null {
    try {
      const raw = globalThis.localStorage?.getItem(key);
      if (!raw || raw.length > 2_000_000) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  write(key: string, value: unknown): void {
    try {
      globalThis.localStorage?.setItem(key, JSON.stringify(value));
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
