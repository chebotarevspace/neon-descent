export class AudioSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  volume = 0.9;
  private ambientNodes: { osc: OscillatorNode; gain: GainNode }[] = [];

  init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.volume;
    this.masterGain.connect(this.ctx.destination);
  }

  resume() { this.ctx?.resume(); }

  setVolume(v: number) {
    this.volume = v;
    if (this.masterGain) this.masterGain.gain.value = v;
  }

  private now() { return this.ctx!.currentTime; }

  private tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, slideTo?: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.now());
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, this.now() + dur);
    g.gain.setValueAtTime(vol, this.now());
    g.gain.exponentialRampToValueAtTime(0.001, this.now() + dur);
    osc.connect(g); g.connect(this.masterGain);
    osc.start(); osc.stop(this.now() + dur);
  }

  private noise(dur: number, vol = 0.3, filterFreq = 1000) {
    if (!this.ctx || !this.masterGain) return;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, this.now());
    g.gain.exponentialRampToValueAtTime(0.001, this.now() + dur);
    src.connect(filter); filter.connect(g); g.connect(this.masterGain);
    src.start(); src.stop(this.now() + dur);
  }

  shoot(weapon: string) {
    if (weapon === 'pistol') { this.noise(0.1, 0.7, 2200); this.tone(180, 0.08, 'square', 0.4, 70); }
    else if (weapon === 'smg') { this.noise(0.06, 0.55, 2800); this.tone(220, 0.05, 'square', 0.3, 90); }
    else if (weapon === 'shotgun') { this.noise(0.22, 0.9, 1400); this.tone(90, 0.15, 'sawtooth', 0.5, 35); }
    else if (weapon === 'auto') { this.noise(0.07, 0.6, 2600); this.tone(160, 0.05, 'square', 0.35, 80); }
    else { this.noise(0.12, 0.7, 3200); this.tone(440, 0.1, 'sawtooth', 0.45, 200); }
  }

  hit() { this.noise(0.06, 0.4, 3500); }
  enemyHit() { this.tone(120, 0.06, 'square', 0.35, 50); this.noise(0.04, 0.2, 4000); }
  enemyDeath() { this.tone(200, 0.3, 'sawtooth', 0.5, 40); this.noise(0.25, 0.35, 900); }
  reload() { this.tone(400, 0.06, 'square', 0.25); setTimeout(() => this.tone(300, 0.06, 'square', 0.25), 150); }
  pickup() { this.tone(660, 0.1, 'sine', 0.4, 990); }
  hurt() { this.noise(0.18, 0.6, 600); this.tone(150, 0.14, 'sawtooth', 0.4, 50); }
  questNew() { this.tone(523, 0.1, 'sine', 0.2); setTimeout(() => this.tone(659, 0.1, 'sine', 0.2), 100); setTimeout(() => this.tone(784, 0.15, 'sine', 0.2), 200); }
  questDone() { this.tone(784, 0.1, 'sine', 0.2); setTimeout(() => this.tone(988, 0.1, 'sine', 0.2), 100); setTimeout(() => this.tone(1175, 0.2, 'sine', 0.2), 200); }
  levelUp() { this.tone(440, 0.12, 'sine', 0.25); setTimeout(() => this.tone(554, 0.12, 'sine', 0.25), 120); setTimeout(() => this.tone(659, 0.2, 'sine', 0.25), 240); }
  bossHit() { this.tone(80, 0.15, 'sawtooth', 0.25, 40); }
  interact() { this.tone(880, 0.06, 'sine', 0.15, 1320); }
  buy() { this.tone(523, 0.08, 'sine', 0.2); setTimeout(() => this.tone(784, 0.12, 'sine', 0.2), 80); }
  explosion() { this.noise(0.4, 0.8, 600); this.tone(60, 0.3, 'sawtooth', 0.6, 25); }
  throwGrenade() { this.tone(300, 0.1, 'sine', 0.2, 150); }

  startAmbient() {
    if (!this.ctx || !this.masterGain) return;
    this.stopAmbient();
    const freqs = [55, 82.5, 110];
    for (const f of freqs) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      g.gain.value = 0.04;
      osc.connect(g); g.connect(this.masterGain);
      osc.start();
      this.ambientNodes.push({ osc, gain: g });
    }
  }

  stopAmbient() {
    for (const n of this.ambientNodes) { try { n.osc.stop(); } catch { /* ignore */ } }
    this.ambientNodes = [];
  }

  private rainNode: { src: AudioBufferSourceNode; gain: GainNode } | null = null;

  startRain() {
    if (!this.ctx || !this.masterGain || this.rainNode) return;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = last * 0.92 + white * 0.08;
      data[i] = last * 0.5 + white * 0.15;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass'; filter.frequency.value = 1800; filter.Q.value = 0.5;
    const g = this.ctx.createGain();
    g.gain.value = 0.12;
    src.connect(filter); filter.connect(g); g.connect(this.masterGain);
    src.start();
    this.rainNode = { src, gain: g };
  }

  stopRain() {
    if (!this.rainNode) return;
    try { this.rainNode.src.stop(); } catch { /* ignore */ }
    this.rainNode = null;
  }

  dispose() { this.stopAmbient(); this.stopRain(); this.ctx?.close(); }
}
