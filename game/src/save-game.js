// Progress persistence in localStorage: cash, story position, where the
// player stood, and lifetime stats. Corrupt or missing data just means a
// fresh game — saving must never break play.

import { SAVE_KEY } from './config.js';
import { G } from './state.js';

export function hasSave() {
  try {
    return !!window.localStorage.getItem(SAVE_KEY);
  } catch (err) {
    return false;
  }
}

export function saveGame() {
  try {
    const data = {
      cash: G.cash,
      lifetimeCash: G.lifetimeCash,
      missionIndex: G.missionIndex,
      x: Math.round(G.player.x),
      y: Math.round(G.player.y),
      stats: G.stats,
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (err) {
    /* storage unavailable: play on without saving */
  }
}

export function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (typeof data.cash !== 'number') return false;
    G.cash = data.cash;
    G.lifetimeCash = data.lifetimeCash || 0;
    G.missionIndex = data.missionIndex || 0;
    if (typeof data.x === 'number' && typeof data.y === 'number') {
      G.player.x = data.x;
      G.player.y = data.y;
    }
    if (data.stats) Object.assign(G.stats, data.stats);
    return true;
  } catch (err) {
    return false;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch (err) {
    /* nothing to clear */
  }
}
