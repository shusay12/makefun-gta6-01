// All sound is synthesised with WebAudio — no audio files. A tiny tropical
// bassline loops under the game; engines, sirens, shots and chimes are
// oscillators and filtered noise. Everything is guarded: if audio is not
// available or not yet unlocked by a gesture, calls simply do nothing.

let ctx = null;
let master = null;
let engineNodes = null;
let sirenNodes = null;
let musicTimer = null;
let musicStep = 0;

export function setMuted(muted) {
  if (master) master.gain.value = muted ? 0 : 0.5;
  if (muted) {
    setEngine(false);
    setSiren(false);
  }
}

export function unlockAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    startMusic();
  } catch (err) {
    ctx = null;
  }
}

function tone(freq, dur, type = 'sine', vol = 0.2, slideTo = null, delay = 0) {
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(dur, vol = 0.2, freq = 1200, delay = 0) {
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = freq;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(filter).connect(gain).connect(master);
  src.start(t0);
}

export function playShot() {
  noise(0.12, 0.35, 2600);
  tone(160, 0.1, 'square', 0.18, 60);
}

export function playHit() {
  noise(0.08, 0.22, 900);
}

export function playCrash(strength = 1) {
  noise(0.25, 0.3 * strength, 500);
  tone(90, 0.22, 'triangle', 0.25 * strength, 45);
}

export function playPickup() {
  tone(660, 0.09, 'sine', 0.22);
  tone(990, 0.12, 'sine', 0.22, null, 0.08);
}

export function playCash() {
  tone(880, 0.08, 'square', 0.14);
  tone(1174, 0.1, 'square', 0.14, null, 0.07);
  tone(1568, 0.16, 'square', 0.14, null, 0.14);
}

export function playBusted() {
  tone(392, 0.18, 'sawtooth', 0.16);
  tone(330, 0.18, 'sawtooth', 0.16, null, 0.16);
  tone(262, 0.34, 'sawtooth', 0.16, null, 0.32);
}

export function playMissionDone() {
  const notes = [523, 659, 784, 1046];
  notes.forEach((n, i) => tone(n, 0.16, 'triangle', 0.2, null, i * 0.09));
}

// Engine hum follows the player's car speed; silent on foot.
export function setEngine(on, speedRatio = 0) {
  if (!ctx) return;
  if (on && !engineNodes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    gain.gain.value = 0.0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    osc.connect(filter).connect(gain).connect(master);
    osc.start();
    engineNodes = { osc, gain };
  }
  if (engineNodes) {
    const target = on ? 0.05 + speedRatio * 0.05 : 0;
    engineNodes.gain.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
    engineNodes.osc.frequency.setTargetAtTime(55 + speedRatio * 165, ctx.currentTime, 0.08);
    if (!on) {
      const nodes = engineNodes;
      engineNodes = null;
      setTimeout(() => { try { nodes.osc.stop(); } catch (e) { /* already stopped */ } }, 350);
    }
  }
}

// Police siren: a two-tone wail that exists only while wanted > 0.
export function setSiren(on) {
  if (!ctx) return;
  if (on && !sirenNodes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 840;
    lfo.frequency.value = 0.55;
    lfoGain.gain.value = 190;
    lfo.connect(lfoGain).connect(osc.frequency);
    gain.gain.value = 0.028;
    osc.connect(gain).connect(master);
    osc.start();
    lfo.start();
    sirenNodes = { osc, lfo };
  }
  if (!on && sirenNodes) {
    try { sirenNodes.osc.stop(); sirenNodes.lfo.stop(); } catch (e) { /* fine */ }
    sirenNodes = null;
  }
}

// A laid-back synth loop: bass line + soft hats, scheduled a step at a time.
const BASSLINE = [110, 0, 110, 0, 130.8, 0, 110, 0, 98, 0, 98, 0, 146.8, 0, 164.8, 0];

function startMusic() {
  if (musicTimer) return;
  musicTimer = setInterval(() => {
    if (!ctx) return;
    const step = musicStep % BASSLINE.length;
    const note = BASSLINE[step];
    if (note) tone(note, 0.22, 'triangle', 0.16);
    if (step % 2 === 0) noise(0.03, 0.05, 6000);
    if (step % 8 === 4) tone(523.25, 0.3, 'sine', 0.05);
    musicStep++;
  }, 240);
}
