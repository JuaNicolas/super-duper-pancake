import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { DeckService } from '../../core/services/deck.service';
import { GameService } from '../../core/services/game.service';
import { Deck } from '../../core/models/game.models';

@Component({
  imports: [RouterLink, MatButtonModule, MatCardModule],
  selector: 'app-deck-selection',
  styleUrl: './deck-selection.scss',
  templateUrl: './deck-selection.html',
})
export class DeckSelection {
  readonly decks = inject(DeckService);
  private readonly game = inject(GameService);
  private readonly router = inject(Router);
  readonly error = signal('');

  select(deck: Deck): void {
    try {
      this.game.startGame(deck);
      void this.router.navigate(['/gameplay']);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not start game.');
    }
  }
}
