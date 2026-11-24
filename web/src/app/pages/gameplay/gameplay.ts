import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { GameService } from '../../core/services/game.service';
import { TimerService } from '../../core/services/timer.service';
import { TurnSoundService } from '../../core/services/turn-sound.service';
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
  readonly turnSound = inject(TurnSoundService);
  private readonly router = inject(Router);
  private swipe: { x: number; y: number; id: number; turnId: string; cardId: string } | null = null;
  readonly dragX = signal(0);
  readonly dragging = signal(false);
  readonly snapBack = signal(false);
  readonly swipeFeedback = computed(() => {
    const x = this.dragX();
    if (Math.abs(x) < 12) return '';
    if (x < 0 && !this.game.canPass()) return 'Passing not allowed';
    const action = x > 0 ? 'Correct +1' : 'Pass';
    return Math.abs(x) >= 70 ? `Release for ${action}` : `Swipe for ${action}`;
  });
  readonly cardTransform = computed(() => {
    const x = Math.max(-150, Math.min(150, this.dragX()));
    return `translateX(${x}px) rotate(${x / 20}deg)`;
  });

  constructor() {
    effect(() => {
      const phase = this.game.state()?.phase;
      if (phase && phase !== 'playing') void this.router.navigate([gamePath(phase)]);
    });
  }

  startTurn(): void {
    this.turnSound.enable();
    this.game.startTurn();
  }

  startSwipe(event: TouchEvent): void {
    const state = this.game.state();
    if (
      event.touches.length !== 1 ||
      !state?.turn ||
      !state.currentCardId ||
      !this.timer.running()
    ) {
      this.cancelSwipe();
      return;
    }
    this.dragX.set(0);
    this.dragging.set(true);
    this.snapBack.set(false);
    const touch = event.touches[0];
    this.swipe = {
      x: touch.clientX,
      y: touch.clientY,
      id: touch.identifier,
      turnId: state.turn.id,
      cardId: state.currentCardId,
    };
  }

  moveSwipe(event: TouchEvent): void {
    const swipe = this.swipe;
    const state = this.game.state();
    if (
      !swipe ||
      event.touches.length !== 1 ||
      !this.timer.running() ||
      state?.turn?.id !== swipe.turnId ||
      state.currentCardId !== swipe.cardId
    ) {
      this.cancelSwipe();
      return;
    }
    const touch = event.touches[0];
    if (touch.identifier !== swipe.id) {
      this.cancelSwipe();
      return;
    }
    const dx = touch.clientX - swipe.x;
    const dy = touch.clientY - swipe.y;
    this.dragX.set(Math.abs(dx) > Math.abs(dy) ? dx : 0);
  }

  endSwipe(event: TouchEvent): void {
    const swipe = this.swipe;
    this.swipe = null;
    const state = this.game.state();
    if (
      !swipe ||
      event.touches.length !== 0 ||
      !this.timer.running() ||
      state?.turn?.id !== swipe.turnId ||
      state.currentCardId !== swipe.cardId
    ) {
      this.resetDrag(true);
      return;
    }
    const touch = Array.from(event.changedTouches).find((item) => item.identifier === swipe.id);
    if (!touch) {
      this.resetDrag(true);
      return;
    }
    const dx = touch.clientX - swipe.x;
    const dy = touch.clientY - swipe.y;
    const accepted =
      Math.abs(dx) >= 70 && Math.abs(dx) > Math.abs(dy) && (dx > 0 || this.game.canPass());
    this.resetDrag(!accepted);
    if (accepted) {
      if (dx > 0) this.game.correct();
      else this.game.pass();
    }
  }

  cancelSwipe(): void {
    this.swipe = null;
    this.resetDrag(true);
  }

  private resetDrag(snapBack: boolean): void {
    this.snapBack.set(snapBack);
    this.dragging.set(false);
    this.dragX.set(0);
  }
}
