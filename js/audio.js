/**
 * ID-RailSim Super-Realistic Indonesian Railway Audio Engine
 * High-fidelity procedural audio synthesizer:
 * - CC206 GE FDL12 Turbo Diesel Engine & Turbo Whine
 * - Nathan K5LA / Leslie RS5T Indonesian 5-Chime Semboyan 35 Horn
 * - Authentic Indonesian Station Announcement Chimes (KAI Melody)
 * - Indonesian JPL Crossing Bell ("Teng-Tong-Teng-Tong")
 * - Dynamic Flange Squeal, Track Clatter, Air Brake & Cab Rumble
 */

class SuperTrainAudioEngine {
  constructor() {
    this.ctx = null;
    this.isInitialized = false;

    // Master bus
    this.masterGain = null;
    this.cabGain = null;

    // Engine sound sources
    this.dieselRumbleGain = null;
    this.turboWhineGain = null;
    this.turboOsc = null;
    this.dieselOscs = [];
    this.exhaustFilter = null;

    // Environmental sound
    this.lastClackDist = 0;
    this.jplPlaying = false;
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.setupEngineSynth();
      this.isInitialized = true;
    } catch (e) {
      console.warn("Web Audio Init failed:", e);
    }
  }

  setupEngineSynth() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 1. Diesel Cylinder Firing Pulse (Sub-bass rumble)
    this.dieselRumbleGain = this.ctx.createGain();
    this.dieselRumbleGain.gain.setValueAtTime(0.12, now);

    this.exhaustFilter = this.ctx.createBiquadFilter();
    this.exhaustFilter.type = 'lowpass';
    this.exhaustFilter.frequency.setValueAtTime(260, now);
    this.exhaustFilter.Q.setValueAtTime(2.5, now);

    // 4 Oscillators for multi-cylinder harmonics (GE 7FDL-12 V12)
    const baseFreqs = [24, 48, 72, 96];
    this.dieselOscs = baseFreqs.map((f, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = (i % 2 === 0) ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(f, now);
      osc.connect(this.exhaustFilter);
      osc.start(now);
      return osc;
    });

    this.exhaustFilter.connect(this.dieselRumbleGain);
    this.dieselRumbleGain.connect(this.masterGain);

    // 2. Turbocharger Whine (High frequency jet-like spool)
    this.turboWhineGain = this.ctx.createGain();
    this.turboWhineGain.gain.setValueAtTime(0.01, now);

    this.turboOsc = this.ctx.createOscillator();
    this.turboOsc.type = 'sine';
    this.turboOsc.frequency.setValueAtTime(950, now);

    const turboFilter = this.ctx.createBiquadFilter();
    turboFilter.type = 'bandpass';
    turboFilter.frequency.setValueAtTime(1400, now);
    turboFilter.Q.setValueAtTime(5.0, now);

    this.turboOsc.connect(turboFilter);
    turboFilter.connect(this.turboWhineGain);
    this.turboWhineGain.connect(this.masterGain);
    this.turboOsc.start(now);
  }

  updateEngine(notch, speedKph) {
    if (!this.isInitialized || !this.ctx) return;
    const now = this.ctx.currentTime;

    // RPM curves based on Notch 0 to 8
    const notchRPM = [400, 480, 560, 650, 740, 830, 920, 1000, 1050][notch] || 400;
    const baseFreq = (notchRPM / 60) * 3.5 + (speedKph * 0.15);

    this.dieselOscs.forEach((osc, i) => {
      osc.frequency.setTargetAtTime(baseFreq * (i + 1), now, 0.15);
    });

    // Exhaust cutoff opens up at higher throttle
    const cutoff = 220 + (notch * 95) + (speedKph * 3.0);
    this.exhaustFilter.frequency.setTargetAtTime(cutoff, now, 0.2);

    // Turbo spool up delay
    const turboFreq = 800 + (notch * 280) + (speedKph * 8.0);
    this.turboOsc.frequency.setTargetAtTime(turboFreq, now, 0.4);
    const turboVol = (notch > 0) ? 0.03 + (notch * 0.02) : 0.005;
    this.turboWhineGain.gain.setTargetAtTime(turboVol, now, 0.3);

    // Engine volume
    const vol = 0.08 + (notch * 0.04) + Math.min(speedKph * 0.001, 0.12);
    this.dieselRumbleGain.gain.setTargetAtTime(vol, now, 0.15);
  }

  // Authentic Semboyan 35 Klakson (Indonesian KAI Nathan K5LA / Leslie RS5T Chords)
  playSemboyan35(duration = 1.4) {
    if (!this.isInitialized) this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Chords: D#4 (311Hz), F#4 (370Hz), G#4 (415Hz), B4 (494Hz), D#5 (622Hz)
    const chord = [311.13, 369.99, 415.30, 493.88, 622.25];

    const hornMaster = this.ctx.createGain();
    hornMaster.gain.setValueAtTime(0, now);
    hornMaster.gain.linearRampToValueAtTime(0.45, now + 0.05);
    hornMaster.gain.setValueAtTime(0.45, now + duration - 0.15);
    hornMaster.gain.linearRampToValueAtTime(0.001, now + duration);

    // Reverb / Air Chamber simulation
    const hornFilter = this.ctx.createBiquadFilter();
    hornFilter.type = 'peaking';
    hornFilter.frequency.setValueAtTime(950, now);
    hornFilter.gain.setValueAtTime(6, now);

    hornMaster.connect(hornFilter);
    hornFilter.connect(this.masterGain);

    chord.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = (idx < 2) ? 'sawtooth' : 'triangle';
      // Slight detune for that rich brassy Indonesian train horn echo
      const detune = (Math.random() - 0.5) * 8;
      osc.frequency.setValueAtTime(freq + detune, now);
      osc.connect(hornMaster);
      osc.start(now);
      osc.stop(now + duration);
    });
  }

  // Indonesian Stasiun KAI Chime Announcement ("Ting... Tong... Tung...")
  playKAIStationChime() {
    if (!this.isInitialized) this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Classic KAI 4-tone station chime: E5, G#5, B5, E6
    const notes = [659.25, 830.61, 987.77, 1318.51];
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.38;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.95);
    });
  }

  // Indonesian JPL Level Crossing Warning Bell ("Teng-tong-teng-tong")
  playJPLCrossingBell() {
    if (!this.isInitialized || !this.ctx) return;
    const now = this.ctx.currentTime;

    const bellFreqs = [1850, 2400];
    bellFreqs.forEach((f, i) => {
      const t = now + i * 0.22;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  // Track Sambungan Rel Clatter ("Klik-Klak... Klik-Klak")
  playTrackClack(speedKph) {
    if (!this.isInitialized || !this.ctx || speedKph < 5) return;
    const now = this.ctx.currentTime;
    const vol = Math.min(speedKph / 100, 0.25);

    // Front bogie strike
    this.createWheelImpact(now, vol);
    // Rear bogie strike 80ms later
    this.createWheelImpact(now + 0.08, vol * 0.75);
  }

  createWheelImpact(time, vol) {
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.06);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.07);
  }

  // Air Brake Release Hiss ("Psssssshhhh")
  playAirBrakeHiss() {
    if (!this.isInitialized || !this.ctx) return;
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.9;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.Q.setValueAtTime(2.2, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
  }

  // Deadman Alert Buzzer
  playDeadmanBuzzer() {
    if (!this.isInitialized || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1046.5, now); // C6 alarm tone

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.setValueAtTime(0.2, now + 0.18);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }
}

window.TrainAudio = new SuperTrainAudioEngine();
