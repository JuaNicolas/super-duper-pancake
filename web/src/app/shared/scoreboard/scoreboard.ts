import { Component, inject } from '@angular/core';
import { GameService } from '../../core/services/game.service';

@Component({
  imports: [],
  selector: 'app-scoreboard',
  styleUrl: './scoreboard.scss',
  templateUrl: './scoreboard.html',
})
export class Scoreboard {
  readonly game = inject(GameService);
}
