import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TurnSoundService {
  private context: AudioContext | null = null;
  private readonly statusValue = signal<'needs-interaction' | 'ready' | 'unavailable'>(
    'needs-interaction',
  );
  readonly status = this.statusValue.asReadonly();
  private readonly lastPlaySucceededValue = signal(false);
  readonly lastPlaySucceeded = this.lastPlaySucceededValue.asReadonly();

  enable(): void {
    try {
      if (typeof AudioContext === 'undefined') {
        this.statusValue.set('unavailable');
        return;
      }
      if (!this.context || this.context.state === 'closed') this.context = new AudioContext();
      const context = this.context;
      if (context.state === 'running') {
        this.statusValue.set('ready');
      } else {
        void context.resume().then(
          () => this.statusValue.set(context.state === 'running' ? 'ready' : 'unavailable'),
          () => this.statusValue.set('unavailable'),
        );
      }
    } catch {
      this.statusValue.set('unavailable');
    }
  }

  play(): void {
    this.lastPlaySucceededValue.set(false);
    const context = this.context;
    if (!context || context.state !== 'running') {
      this.statusValue.set('unavailable');
      return;
    }
    try {
      for (let index = 0; index < 3; index++) {
        const start = context.currentTime + index * 0.28;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
        };
        oscillator.start(start);
        oscillator.stop(start + 0.2);
      }
      this.statusValue.set('ready');
      this.lastPlaySucceededValue.set(true);
    } catch {
      this.statusValue.set('unavailable');
    }
  }
}
