/**
 * Synthesized UI sound effects via the Web Audio API — no audio files.
 * Call `sfx.setEnabled(false)` to mute (wired to the profile's sound toggle).
 */
type Tone = {
  type: OscillatorType;
  /** [frequency, offsetSeconds] steps; consecutive steps ramp exponentially when `ramp` is set */
  freqs: [number, number][];
  ramp?: boolean;
  gain: number;
  duration: number;
  delay?: number;
};

class AudioEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;

  setEnabled(on: boolean) {
    this.enabled = on;
  }

  private context(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private play(tone: Tone) {
    const ctx = this.context();
    if (!ctx) return;
    const start = ctx.currentTime + (tone.delay ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = tone.type;
    tone.freqs.forEach(([f, t], i) => {
      if (tone.ramp && i > 0) osc.frequency.exponentialRampToValueAtTime(f, start + t);
      else osc.frequency.setValueAtTime(f, start + t);
    });
    gain.gain.setValueAtTime(tone.gain, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + tone.duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + tone.duration);
  }

  click() {
    this.play({ type: 'sine', freqs: [[850, 0], [320, 0.035]], ramp: true, gain: 0.08, duration: 0.035 });
  }

  check() {
    this.play({ type: 'triangle', freqs: [[600, 0], [900, 0.06]], ramp: true, gain: 0.1, duration: 0.06 });
  }

  success() {
    this.play({
      type: 'triangle',
      freqs: [[523.25, 0], [659.25, 0.08], [783.99, 0.16], [1046.5, 0.24]],
      gain: 0.12,
      duration: 0.45,
    });
  }

  reward() {
    this.play({ type: 'square', freqs: [[440, 0], [880, 0.25]], ramp: true, gain: 0.1, duration: 0.3 });
  }

  levelUp() {
    [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) =>
      this.play({ type: 'triangle', freqs: [[f, 0]], gain: 0.12, duration: 0.3, delay: i * 0.08 }),
    );
  }

  error() {
    this.play({ type: 'sawtooth', freqs: [[220, 0], [160, 0.1]], gain: 0.1, duration: 0.25 });
  }
}

export const sfx = new AudioEngine();
