import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  imports: [RouterLink, MatButtonModule],
  selector: 'app-rules',
  styleUrl: './rules.scss',
  templateUrl: './rules.html',
})
export class Rules {}
