import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { GameService } from '../../core/services/game.service';
import { gamePath } from '../../app.routes';

@Component({
  imports: [RouterLink, MatButtonModule, MatCardModule],
  selector: 'app-home',
  styleUrl: './home.scss',
  templateUrl: './home.html',
})
export class Home {
  readonly game = inject(GameService);
  private readonly router = inject(Router);
  readonly gamePath = gamePath;

  start(): void {
    if (this.game.state() && !window.confirm('Replace the saved game with a new game?')) return;
    this.game.newGame();
    void this.router.navigate(['/team-setup']);
  }
}
