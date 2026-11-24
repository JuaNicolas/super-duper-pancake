import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { DeckService } from '../../core/services/deck.service';
import { GameService } from '../../core/services/game.service';
import { Deck } from '../../core/models/game.models';

@Component({
  imports: [FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule],
  selector: 'app-deck-management',
  styleUrl: './deck-management.scss',
  templateUrl: './deck-management.html',
})
export class DeckManagement {
  readonly decks = inject(DeckService);
  readonly game = inject(GameService);
  readonly message = signal('');
  readonly error = signal('');
  editingId: string | null = null;
  deckName = '';
  characters = '';
  json = '';

  edit(deck: Deck): void {
    this.editingId = deck.builtIn ? null : deck.id;
    this.deckName = deck.builtIn ? `${deck.name} copy` : deck.name;
    this.characters = deck.cards.map((card) => card.name).join('\n');
    this.message.set('Deck loaded into the editor.');
  }

  clear(): void {
    this.editingId = null;
    this.deckName = '';
    this.characters = '';
  }

  save(): void {
    this.perform(() => {
      this.decks.save({
        id: this.editingId ?? crypto.randomUUID(),
        name: this.deckName.trim(),
        cards: this.characters
          .split('\n')
          .map((name) => name.trim())
          .filter(Boolean)
          .map((name) => ({ id: crypto.randomUUID(), name })),
      });
      this.clear();
    }, 'Deck saved.');
  }

  delete(deck: Deck): void {
    if (window.confirm(`Delete "${deck.name}"? Your active game will not be changed.`)) {
      this.perform(() => this.decks.delete(deck.id), 'Deck deleted.');
    }
  }

  import(): void {
    this.perform(() => this.decks.importJson(this.json), 'Deck imported.');
  }

  async importFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 1_000_000) {
      this.error.set('JSON files must be smaller than 1 MB.');
      input.value = '';
      return;
    }
    try {
      this.json = await file.text();
      this.import();
    } catch {
      this.error.set('Could not read the file.');
    }
    input.value = '';
  }

  export(deck: Deck): void {
    this.perform(() => {
      this.json = this.decks.exportJson(deck.id);
      const url = URL.createObjectURL(new Blob([this.json], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'party-cards-deck.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }, 'Deck exported. JSON is also available below.');
  }

  private perform(action: () => void, success: string): void {
    this.error.set('');
    this.message.set('');
    try {
      action();
      this.message.set(success);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Deck operation failed.');
    }
  }
}
