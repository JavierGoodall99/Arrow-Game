// Native Web Audio API Sound Synthesizer for Archery Game Feel
class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    // Read muted state from localStorage if available
    try {
      const stored = localStorage.getItem('archery_muted');
      if (stored) {
        this.muted = stored === 'true';
      }
    } catch (e) {
      // Ignore security/localStorage issues in iframe
    }
  }

  private init() {
    if (!this.ctx) {
      // @ts-ignore
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    // Resume context if suspended (common browser restriction)
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setMute(muted: boolean) {
    this.muted = muted;
    try {
      localStorage.setItem('archery_muted', String(muted));
    } catch (e) {}
  }

  public getMuted(): boolean {
    return this.muted;
  }

  // Play a soft wooden "creak" click
  public playCreak(tension: number) {
    if (this.muted) return;
    const ctx = this.init();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Synthesize a wooden creak tick
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      // Wood creak sounds best as a high-pass filtered triangle wave with rapid pitch decay
      osc.type = 'triangle';
      
      // Tension shifts the pitch slightly higher
      const baseFreq = 80 + tension * 40;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(10, now + 0.04);

      gain.gain.setValueAtTime(0.04 * tension, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      // Simple bandpass filter for wood chamber resonance
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.Q.setValueAtTime(4, now);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (err) {
      console.warn("Audio playCreak error", err);
    }
  }

  // Play arrow flight whoosh
  public playRelease() {
    if (this.muted) return;
    const ctx = this.init();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const duration = 0.18;

      // Create white noise buffer
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      // Whoosh sweep: frequency goes from high to low
      filter.frequency.setValueAtTime(1800, now);
      filter.frequency.exponentialRampToValueAtTime(400, now + duration);
      filter.Q.setValueAtTime(2.0, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.03); // rapid swell
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noiseNode.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noiseNode.start(now);
      noiseNode.stop(now + duration);
    } catch (err) {
      console.warn("Audio playRelease error", err);
    }
  }

  // Play thunk of hitting target. Higher score = brighter ding
  public playHitTarget(isBullseye: boolean) {
    if (this.muted) return;
    const ctx = this.init();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // 1. Thunk sound (low frequency thud)
      const oscThud = ctx.createOscillator();
      const gainThud = ctx.createGain();

      oscThud.type = 'sine';
      oscThud.frequency.setValueAtTime(140, now);
      oscThud.frequency.exponentialRampToValueAtTime(40, now + 0.15);

      gainThud.gain.setValueAtTime(0.35, now);
      gainThud.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      // Low-pass to keep it muddy and organic
      const lpf = ctx.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.frequency.setValueAtTime(220, now);

      oscThud.connect(lpf);
      lpf.connect(gainThud);
      gainThud.connect(ctx.destination);

      oscThud.start(now);
      oscThud.stop(now + 0.16);

      // 2. Click/snap sound (impact vibration)
      const oscSnap = ctx.createOscillator();
      const gainSnap = ctx.createGain();
      oscSnap.type = 'triangle';
      oscSnap.frequency.setValueAtTime(450, now);
      oscSnap.frequency.exponentialRampToValueAtTime(120, now + 0.06);

      gainSnap.gain.setValueAtTime(0.12, now);
      gainSnap.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      oscSnap.connect(gainSnap);
      gainSnap.connect(ctx.destination);

      oscSnap.start(now);
      oscSnap.stop(now + 0.07);

      // 3. Perfect Bullseye Chime!
      if (isBullseye) {
        const oscChime1 = ctx.createOscillator();
        const oscChime2 = ctx.createOscillator();
        const gainChime = ctx.createGain();

        oscChime1.type = 'sine';
        oscChime1.frequency.setValueAtTime(1200, now);
        oscChime1.frequency.exponentialRampToValueAtTime(1500, now + 0.4);

        oscChime2.type = 'sine';
        oscChime2.frequency.setValueAtTime(1800, now); // perfect fifth harmony
        oscChime2.frequency.exponentialRampToValueAtTime(2100, now + 0.4);

        gainChime.gain.setValueAtTime(0.0, now);
        gainChime.gain.linearRampToValueAtTime(0.15, now + 0.05); // sweet swell
        gainChime.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        oscChime1.connect(gainChime);
        oscChime2.connect(gainChime);
        gainChime.connect(ctx.destination);

        oscChime1.start(now);
        oscChime2.start(now);
        oscChime1.stop(now + 0.55);
        oscChime2.stop(now + 0.55);
      }
    } catch (err) {
      console.warn("Audio playHitTarget error", err);
    }
  }

  // Play a lighter, higher-pitched wood ring clip sound
  public playNearMiss() {
    if (this.muted) return;
    const ctx = this.init();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Clean tight triangle tick
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(350, now + 0.05);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch (err) {
      console.warn("Audio playNearMiss error", err);
    }
  }

  // Play stone obstacle hard resonance clack
  public playHitObstacle() {
    if (this.muted) return;
    const ctx = this.init();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Higher pitched wood/stone crack
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.08);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      // High resonance bandpass to make it sound hard
      const bpf = ctx.createBiquadFilter();
      bpf.type = 'bandpass';
      bpf.frequency.setValueAtTime(600, now);
      bpf.Q.setValueAtTime(5, now);

      osc.connect(bpf);
      bpf.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);

      // Low impact backing
      const oscLow = ctx.createOscillator();
      const gainLow = ctx.createGain();
      oscLow.type = 'sine';
      oscLow.frequency.setValueAtTime(100, now);
      oscLow.frequency.exponentialRampToValueAtTime(40, now + 0.08);

      gainLow.gain.setValueAtTime(0.2, now);
      gainLow.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      oscLow.connect(gainLow);
      gainLow.connect(ctx.destination);

      oscLow.start(now);
      oscLow.stop(now + 0.09);
    } catch (err) {
      console.warn("Audio playHitObstacle error", err);
    }
  }

  // Play soft ground hit (muffled thud)
  public playHitGround() {
    if (this.muted) return;
    const ctx = this.init();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const duration = 0.15;

      // Soft noise puff
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = buffer;

      const lpf = ctx.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.frequency.setValueAtTime(180, now); // very low muffled cutoff

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noiseNode.connect(lpf);
      lpf.connect(gain);
      gain.connect(ctx.destination);

      noiseNode.start(now);
      noiseNode.stop(now + duration);
    } catch (err) {
      console.warn("Audio playHitGround error", err);
    }
  }

  // Play Level Cleared arpeggio
  public playLevelUp() {
    if (this.muted) return;
    const ctx = this.init();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C major notes
      const duration = 0.12;

      notes.forEach((freq, idx) => {
        const timeOffset = now + idx * 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, timeOffset);

        gain.gain.setValueAtTime(0.0, timeOffset);
        gain.gain.linearRampToValueAtTime(0.08, timeOffset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, timeOffset + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(timeOffset);
        osc.stop(timeOffset + 0.3);
      });
    } catch (err) {
      console.warn("Audio playLevelUp error", err);
    }
  }

  // Play Level Failed slow descending sweep
  public playLevelFail() {
    if (this.muted) return;
    const ctx = this.init();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [293.66, 277.18, 261.63, 220.00]; // D, C#, C, A (melancholic descending)
      
      notes.forEach((freq, idx) => {
        const timeOffset = now + idx * 0.15;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, timeOffset);
        osc.frequency.linearRampToValueAtTime(freq - 30, timeOffset + 0.2); // pitch slide down

        // lowpass filter for warmth and less harshness
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, timeOffset);

        gain.gain.setValueAtTime(0.0, timeOffset);
        gain.gain.linearRampToValueAtTime(0.05, timeOffset + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, timeOffset + 0.35);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(timeOffset);
        osc.stop(timeOffset + 0.4);
      });
    } catch (err) {
      console.warn("Audio playLevelFail error", err);
    }
  }
}

export const audio = new SoundEngine();
