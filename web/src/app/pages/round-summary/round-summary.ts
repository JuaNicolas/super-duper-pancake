import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { GameService } from '../../core/services/game.service';
import { Scoreboard } from '../../shared/scoreboard/scoreboard';

@Component({
  imports: [MatButtonModule, Scoreboard],
  selector: 'app-round-summary',
  styleUrl: './round-summary.scss',
  templateUrl: './round-summary.html',
})
export class RoundSummary {
  readonly game = inject(GameService);
  private readonly router = inject(Router);
  readonly statistics = computed(() =>
    this.game.scores().map((score) => {
      const turns =
        this.game
          .state()
          ?.turns.filter(
            (turn) => turn.round === this.game.state()?.round && turn.teamId === score.teamId,
          ) ?? [];
      return {
        ...score,
        turns: turns.length,
        passes: turns.reduce((count, turn) => count + turn.passedCardIds.length, 0),
      };
    }),
  );

  continue(): void {
    this.game.nextRound();
    void this.router.navigate(['/gameplay']);
  }
}
