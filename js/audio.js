/**
 * ID-RailSim Web Audio API Synthesizer
 * Zero-asset procedural audio generation for Indonesian locomotives & EMUs
 */
class TrainAudioEngine {
  constructor() {
    this.ctx = null;
    this.isInitialized = false;

    // Engine sound nodes
    this.engineGain = null;
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineNoise = null;

    // Track clatter nodes
    this.lastClackDist = 0;

    // Horn state
    this.hornGain = null;
    this.hornOscs = [];
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.setupEngineSynth();
      this.isInitialized = true;
    } catch (e) {
      console.warn("Audio Context Init Failed", e);
    }
  }

  setupEngineSynth() {
    if (!this.ctx) return;

    // Master Engine Gain
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    this.engineGain.connect(this.ctx.destination);

    // Diesel Engine Low Rumble (Osc 1 & 2)
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.setValueAtTime(32, this.ctx.currentTime);

    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.setValueAtTime(64, this.ctx.currentTime);

    // Lowpass filter for deep diesel engine body
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(220, this.ctx.currentTime);

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
  }

  updateEngine(notch, speedKph) {
    if (!this.isInitialized || !this.ctx) return;

    const baseFreq = 30 + (notch * 7.5) + (speedKph * 0.25);
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.2);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, this.ctx.currentTime, 0.2);

    const filterCutoff = 180 + (notch * 80) + (speedKph * 2.0);
    this.engineFilter.frequency.setTargetAtTime(filterCutoff, this.ctx.currentTime, 0.2);

    const volume = 0.04 + (notch * 0.02) + Math.min(speedKph * 0.001, 0.1);
    this.engineGain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.1);
  }

  // Semboyan 35 Klakson (Indonesian Leslie RS5T / Nathan 5-Chime Horn)
  playSemboyan35(duration = 1.2) {
    if (!this.isInitialized) this.init();
    if (!this.ctx) return;

    // Chords for Nathan K5LA / Leslie RS5T: D#4, F#4, G#4, B4, D#5
    const freqs = [311.13, 369.99, 415.30, 493.88, 622.25];
    const now = this.ctx.currentTime;

    const masterHornGain = this.ctx.createGain();
    masterHornGain.gain.setValueAtTime(0, now);
    masterHornGain.gain.linearRampToValueAtTime(0.35, now + 0.06);
    masterHornGain.gain.setValueAtTime(0.35, now + duration - 0.15);
    masterHornGain.gain.linearRampToValueAtTime(0.001, now + duration);
    masterHornGain.connect(this.ctx.destination);

    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = (idx % 2 === 0) ? 'sawtooth' : 'triangle';
      // Slight pitch instability for authentic air rush
      osc.frequency.setValueAtTime(f * (1.0 + (Math.random() * 0.008 - 0.004)), now);
      osc.connect(masterHornGain);
      osc.start(now);
      osc.stop(now + duration);
    });
  }

  // Air Brake Release Hiss ("Psssssshh")
  playAirBrakeHiss() {
    if (!this.isInitialized || !this.ctx) return;
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.8;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.setValueAtTime(1.8, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
  }

  // Wheel-Rail Track Joint Clatter ("Klik-Klak")
  playTrackClack(speedKph) {
    if (!this.isInitialized || !this.ctx || speedKph < 5) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);

    const gain = this.ctx.createGain();
    const vol = Math.min(speedKph / 120, 0.15);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // Deadman Alarm Warning Buzzer
  playDeadmanBuzzer() {
    if (!this.isInitialized || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.setValueAtTime(0.18, now + 0.15);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }
}

window.TrainAudio = new TrainAudioEngine();
