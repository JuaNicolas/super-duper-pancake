import { TurnSoundService } from './turn-sound.service';

class FakeAudioContext {
  state: AudioContextState = 'running';
  currentTime = 10;
  destination = {};
  oscillators: {
    frequency: { value: number };
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    onended: (() => void) | null;
  }[] = [];
  resume = vi.fn(async () => {
    this.state = 'running';
  });
  createOscillator() {
    const oscillator = {
      frequency: { value: 0 },
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null,
    };
    this.oscillators.push(oscillator);
    return oscillator;
  }
  createGain() {
    return {
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }
}

describe('TurnSoundService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('unlocks audio and schedules three short beeps', () => {
    const context = new FakeAudioContext();
    vi.stubGlobal(
      'AudioContext',
      vi.fn(function () {
        return context;
      }),
    );
    const sound = new TurnSoundService();
    sound.enable();
    expect(sound.status()).toBe('ready');
    sound.play();
    expect(sound.lastPlaySucceeded()).toBe(true);
    expect(context.oscillators).toHaveLength(3);
    expect(context.oscillators.map((oscillator) => oscillator.start.mock.calls[0][0])).toEqual([
      10, 10.28, 10.56,
    ]);
    context.oscillators.forEach((oscillator, index) => {
      expect(oscillator.stop.mock.calls[0][0]).toBeCloseTo(10.2 + index * 0.28);
    });
  });

  it('reports unavailable audio without preventing the visual alert', async () => {
    const sound = new TurnSoundService();
    vi.stubGlobal('AudioContext', undefined);
    sound.enable();
    sound.play();
    expect(sound.status()).toBe('unavailable');
    expect(sound.lastPlaySucceeded()).toBe(false);
    const context = new FakeAudioContext();
    context.state = 'suspended';
    context.resume.mockRejectedValue(new Error('Audio blocked'));
    vi.stubGlobal(
      'AudioContext',
      vi.fn(function () {
        return context;
      }),
    );
    sound.enable();
    await Promise.resolve();
    expect(sound.status()).toBe('unavailable');
    sound.play();
    expect(sound.lastPlaySucceeded()).toBe(false);
  });

  it('can enable audio after restoring an active turn', async () => {
    const context = new FakeAudioContext();
    context.state = 'suspended';
    vi.stubGlobal(
      'AudioContext',
      vi.fn(function () {
        return context;
      }),
    );
    const sound = new TurnSoundService();
    sound.enable();
    await Promise.resolve();
    expect(sound.status()).toBe('ready');
    sound.play();
    expect(sound.lastPlaySucceeded()).toBe(true);
  });
});
