import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { GameService } from './core/services/game.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render navigation and a skip link', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand')?.textContent).toContain('Party Cards');
    expect(compiled.querySelector('.skip-link')?.getAttribute('href')).toBe('#main');
    expect(compiled.querySelector('nav')?.getAttribute('aria-label')).toBe('Main navigation');
  });

  it('shows a dismissible time-up alert in the app shell', () => {
    const timeUp = signal(false);
    TestBed.overrideProvider(GameService, {
      useValue: { timeUp, dismissTimeUp: () => timeUp.set(false) },
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[role="alert"]')).toBeNull();
    timeUp.set(true);
    fixture.detectChanges();
    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain("Time's up!");
    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain('Sound unavailable');
    compiled.querySelector<HTMLButtonElement>('.time-up button')!.click();
    fixture.detectChanges();
    expect(compiled.querySelector('[role="alert"]')).toBeNull();
  });
});
