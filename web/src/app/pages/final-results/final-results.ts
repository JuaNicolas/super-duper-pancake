import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { GameService } from '../../core/services/game.service';
import { Scoreboard } from '../../shared/scoreboard/scoreboard';

@Component({
  imports: [RouterLink, MatButtonModule, Scoreboard],
  selector: 'app-final-results',
  styleUrl: './final-results.scss',
  templateUrl: './final-results.html',
})
export class FinalResults {
  readonly game = inject(GameService);
  private readonly router = inject(Router);
  readonly winner = computed(() => {
    const scores = this.game.scores();
    if (scores.length !== 2 || scores[0].total === scores[1].total) return "It's a tie!";
    return `${scores[0].total > scores[1].total ? scores[0].name : scores[1].name} wins!`;
  });

  again(): void {
    this.game.newGame();
    void this.router.navigate(['/team-setup']);
  }
}
