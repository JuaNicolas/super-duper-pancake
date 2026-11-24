import { Component, effect, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { GameService } from '../../core/services/game.service';
import { TimerService } from '../../core/services/timer.service';
import { Scoreboard } from '../../shared/scoreboard/scoreboard';
import { gamePath } from '../../app.routes';

@Component({
  imports: [RouterLink, MatButtonModule, MatProgressBarModule, Scoreboard],
  selector: 'app-gameplay',
  styleUrl: './gameplay.scss',
  templateUrl: './gameplay.html',
})
export class Gameplay {
  readonly game = inject(GameService);
  readonly timer = inject(TimerService);
  private readonly router = inject(Router);

  constructor() {
    effect(() => {
      const phase = this.game.state()?.phase;
      if (phase && phase !== 'playing') void this.router.navigate([gamePath(phase)]);
    });
  }
}
