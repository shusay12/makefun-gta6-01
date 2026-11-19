// The single shared game state. Every system module imports G and reads or
// mutates its slice; main.js owns the loop that drives them in order.

export const G = {
  mode: 'title', // 'title' | 'play' | 'paused' | 'busted' | 'wasted'
  staging: null, // screenshot scene name, or null during real play
  time: 0, // seconds since boot, always advances (drives pulses and water)
  playTime: 0, // seconds spent in 'play'
  seed: 7,

  cam: { x: 0, y: 0, zoom: 1, shake: 0 },

  player: {
    x: 336, y: 1180, angle: -Math.PI / 2, speed: 0,
    health: 100, car: null, walkCycle: 0, hurtAt: -99,
    bustMeter: 0, fireCooldown: 0,
  },

  cars: [], // traffic, parked, police and the player's ride all live here
  peds: [],
  bullets: [],
  particles: [],
  skids: [], // tyre marks left by hard driving

  cash: 120,
  lifetimeCash: 0,
  wanted: 0, // 0..5 stars, fractional heat underneath
  heat: 0,
  lastCrimeAt: -99,
  stats: { stolen: 0, shots: 0, hits: 0, topSpeed: 0, distance: 0 },

  missionIndex: 0, // next story mission to offer
  mission: null, // active mission runtime state
  errand: null, // repeatable side job, once the story is done
  dialogue: null, // { speaker, text, until }
  toast: null, // { text, sub, until }
  prompt: null, // contextual "Press E …" line for the HUD

  mouse: { x: 0, y: 0, down: false, worldX: 0, worldY: 0 },
};

export function say(speaker, text, seconds = 4.5) {
  G.dialogue = { speaker, text, until: G.time + seconds };
}

export function toast(text, sub = '', seconds = 3.6) {
  G.toast = { text, sub, until: G.time + seconds };
}

export function addCash(amount) {
  G.cash += amount;
  if (amount > 0) G.lifetimeCash += amount;
}

// Register a crime: raises heat (fractional stars) and restarts decay.
export function commitCrime(stars) {
  G.heat = Math.min(5, G.heat + stars);
  G.wanted = Math.ceil(G.heat - 1e-6);
  if (G.heat > 0 && G.wanted === 0) G.wanted = 1;
  G.lastCrimeAt = G.time;
}
