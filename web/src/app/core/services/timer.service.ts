import { Injectable, OnDestroy, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TimerService implements OnDestroy {
  private readonly remainingValue = signal(0);
  private readonly runningValue = signal(false);
  readonly remaining = this.remainingValue.asReadonly();
  readonly running = this.runningValue.asReadonly();
  private interval: ReturnType<typeof setInterval> | null = null;

  start(deadline: number, onExpired: () => void): void {
    if (!Number.isFinite(deadline) || deadline < 0) throw new Error('Invalid turn deadline.');
    this.stop();
    this.runningValue.set(true);
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      this.remainingValue.set(seconds);
      if (seconds === 0) {
        this.stop();
        onExpired();
      }
    };
    this.interval = setInterval(tick, 100);
    tick();
  }

  stop(): void {
    if (this.interval !== null) clearInterval(this.interval);
    this.interval = null;
    this.runningValue.set(false);
    this.remainingValue.set(0);
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
