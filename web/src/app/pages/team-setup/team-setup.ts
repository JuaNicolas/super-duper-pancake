import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { GameService } from '../../core/services/game.service';
import { Player, Team } from '../../core/models/game.models';

@Component({
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  selector: 'app-team-setup',
  styleUrl: './team-setup.scss',
  templateUrl: './team-setup.html',
})
export class TeamSetup {
  private readonly game = inject(GameService);
  private readonly router = inject(Router);
  readonly players = signal<Player[]>([]);
  readonly teams = signal<Team[]>([]);
  readonly error = signal('');
  playerName = '';
  teamNames = ['Team Sunrise', 'Team Moonlight'];

  addPlayer(): void {
    const name = this.playerName.trim();
    if (!name || name.length > 60) {
      this.error.set('Enter a player name between 1 and 60 characters.');
      return;
    }
    this.players.update((players) => [...players, { id: crypto.randomUUID(), name }]);
    this.playerName = '';
    this.teams.set([]);
    this.error.set('');
  }

  removePlayer(id: string): void {
    this.players.update((players) => players.filter((player) => player.id !== id));
    this.teams.set([]);
  }

  balance(): void {
    this.teams.set(
      this.teamNames.map((name, index) => ({
        id: `team-${index + 1}`,
        name: name.trim() || `Team ${index + 1}`,
        players: this.players().filter((_, playerIndex) => playerIndex % 2 === index),
      })),
    );
  }

  movePlayer(id: string): void {
    const teams = this.teams();
    const source = teams.findIndex((team) => team.players.some((player) => player.id === id));
    if (source < 0) return;
    const player = teams[source].players.find((player) => player.id === id)!;
    this.teams.set(
      teams.map((team, index) => ({
        ...team,
        players:
          index === source ? team.players.filter((p) => p.id !== id) : [...team.players, player],
      })),
    );
  }

  continue(): void {
    const teams = this.teams().map((team, index) => ({
      ...team,
      name: this.teamNames[index].trim() || `Team ${index + 1}`,
    }));
    if (teams.length !== 2 || teams.some((team) => team.players.length < 2)) {
      this.error.set('Add at least four players, with at least two on each team.');
      return;
    }
    if (Math.abs(teams[0].players.length - teams[1].players.length) > 1) {
      this.error.set('Balance the teams so their sizes differ by no more than one.');
      return;
    }
    if (
      this.game.state()?.phase !== 'setup' &&
      this.game.state() &&
      !window.confirm('Replace the saved game with these teams?')
    )
      return;
    try {
      if (!this.game.state() || !['setup', 'deck-selection'].includes(this.game.state()!.phase)) {
        this.game.newGame();
      }
      this.game.setupTeams(teams);
      void this.router.navigate(['/deck-selection']);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not create teams.');
    }
  }
}
