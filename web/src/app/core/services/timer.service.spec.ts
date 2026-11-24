import { vi } from 'vitest';
import { TimerService } from './timer.service';

describe('TimerService', () => {
  let timer: TimerService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    timer = new TimerService();
  });

  afterEach(() => {
    timer.ngOnDestroy();
    vi.useRealTimers();
  });

  it('derives rounded seconds from an absolute deadline and expires once', () => {
    const expired = vi.fn();
    timer.start(Date.now() + 60_000, expired);
    expect(timer.remaining()).toBe(60);
    vi.advanceTimersByTime(1500);
    expect(timer.remaining()).toBe(59);
    vi.setSystemTime(Date.now() + 70_000);
    vi.advanceTimersByTime(100);
    expect(timer.remaining()).toBe(0);
    expect(timer.running()).toBe(false);
    expect(expired).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1000);
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it('expires immediately for a past deadline', () => {
    const expired = vi.fn();
    timer.start(Date.now() - 1, expired);
    expect(expired).toHaveBeenCalledTimes(1);
    expect(timer.running()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('replaces prior intervals and cleans up on stop and destroy', () => {
    const oldCallback = vi.fn();
    const newCallback = vi.fn();
    timer.start(Date.now() + 1000, oldCallback);
    timer.start(Date.now() + 2000, newCallback);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(2000);
    expect(oldCallback).not.toHaveBeenCalled();
    expect(newCallback).toHaveBeenCalledTimes(1);
    timer.start(Date.now() + 1000, oldCallback);
    timer.stop();
    expect(vi.getTimerCount()).toBe(0);
    timer.start(Date.now() + 1000, oldCallback);
    timer.ngOnDestroy();
    expect(vi.getTimerCount()).toBe(0);
    expect(timer.remaining()).toBe(0);
    expect(timer.running()).toBe(false);
  });

  it('rejects invalid deadlines', () => {
    expect(() => timer.start(NaN, () => {})).toThrow();
    expect(() => timer.start(Infinity, () => {})).toThrow();
  });
});
