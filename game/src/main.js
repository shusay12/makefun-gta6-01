// Palmaris Heat — boot and the game loop. Wires every system together:
// input, the player on foot and in cars, traffic, police, gunplay,
// missions, effects, camera, HUD and the staged screenshot scenes.

import { G, say } from './state.js';
import { WORLD_W, WORLD_H } from './config.js';
import { mulberry32, clamp, lerp } from './random.js';
import * as input from './input.js';
import { unlockAudio, setMuted, setEngine, setSiren } from './audio.js';
import { spawnTraffic, spawnParked, updateTraffic, updateCarDamage, drawCar } from './vehicles.js';
import { spawnPeds, updatePeds, drawPed } from './pedestrians.js';
import { updatePlayer, drawPlayer } from './player.js';
import { updateDriving } from './driving.js';
import { updatePolice, updateWanted, wastedPlayer } from './police.js';
import { updateCombat, drawBullets } from './combat.js';
import { updateMissions, currentObjective, storyDone, startErrand } from './missions.js';
import { updateEffects, drawSkids, drawParticles } from './effects.js';
import { drawWorld, drawObjectiveMarker } from './world-render.js';
import { drawHUD, drawTitleScreen, drawPauseOverlay, drawEndOverlay } from './hud.js';
import { hasSave, loadGame, saveGame, clearSave } from './save-game.js';
import { setupScene } from './scenes.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let viewW = 1280;
let viewH = 800;
let dpr = 1;

function resize() {
  dpr = Math.min(1.5, window.devicePixelRatio || 1);
  viewW = window.innerWidth;
  viewH = window.innerHeight;
  canvas.width = Math.floor(viewW * dpr);
  canvas.height = Math.floor(viewH * dpr);
  canvas.style.width = `${viewW}px`;
  canvas.style.height = `${viewH}px`;
}
window.addEventListener('resize', resize);
resize();

input.initInput(canvas, G.mouse);

// --- World boot -------------------------------------------------------------

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || 7);
G.seed = seed;
const worldRng = mulberry32(seed * 1000 + 17);
spawnTraffic(worldRng, 15);
spawnParked(worldRng, 9);
spawnPeds(worldRng, 22);

const sceneName = params.get('scene');
if (sceneName) {
  setupScene(sceneName);
} else {
  G.cam.x = G.player.x;
  G.cam.y = G.player.y;
}

let saveTimer = 0;
let started = false;

function startGame(fresh) {
  if (fresh) {
    clearSave();
    G.cash = 120;
    G.lifetimeCash = 0;
    G.missionIndex = 0;
    G.player.x = 336;
    G.player.y = 1180;
    G.player.health = 100;
  } else if (hasSave()) {
    loadGame();
  }
  G.mode = 'play';
  started = true;
  if (storyDone() && !G.errand) startErrand();
  if (!fresh) say('Marisol Vega', 'Back in Palmaris, Rio. The gold marker is your next job.', 4.5);
}

function handleModeKeys() {
  if (G.mode === 'title') {
    if (input.pressed('Enter')) {
      unlockAudio();
      startGame(false);
    }
    if (input.pressed('KeyN')) {
      unlockAudio();
      startGame(true);
    }
    return;
  }
  if (G.mode === 'busted' || G.mode === 'wasted') {
    if (input.pressed('Enter')) G.mode = 'play';
    return;
  }
  if (input.pressed('KeyP') || input.pressed('Escape')) {
    if (G.mode === 'play') {
      G.mode = 'paused';
      setEngine(false);
      setSiren(false);
    } else if (G.mode === 'paused') {
      G.mode = 'play';
    }
  }
  if (input.pressed('KeyM')) {
    G.muted = !G.muted;
    setMuted(G.muted);
  }
}

// --- Update -------------------------------------------------------------------

function update(dt) {
  G.prompt = null;
  updatePlayer(dt);
  updateDriving(dt);
  updateTraffic(dt, worldRng);
  updatePolice(dt);
  updateWanted(dt);
  updatePeds(dt, worldRng);
  updateCombat(dt);
  updateMissions(dt);
  updateCarDamage(dt);
  if (G.player.health <= 0 && G.mode === 'play') wastedPlayer();

  // Camera follows with a little look-ahead in a car.
  const p = G.player;
  const look = p.car ? 0.32 : 0.08;
  const tx = p.x + Math.cos(p.angle) * (p.car ? Math.abs(p.car.speed) * look : 0);
  const ty = p.y + Math.sin(p.angle) * (p.car ? Math.abs(p.car.speed) * look : 0);
  G.cam.x = lerp(G.cam.x, tx, 1 - Math.pow(0.0015, dt));
  G.cam.y = lerp(G.cam.y, ty, 1 - Math.pow(0.0015, dt));
  const hw = viewW / 2 / G.cam.zoom;
  const hh = viewH / 2 / G.cam.zoom;
  if (hw < WORLD_W) G.cam.x = clamp(G.cam.x, hw - 240, WORLD_W - hw + 240);
  if (hh < WORLD_H) G.cam.y = clamp(G.cam.y, hh - 240, WORLD_H - hh + 240);

  saveTimer += dt;
  if (saveTimer > 20) {
    saveTimer = 0;
    saveGame();
  }
}

// --- Render ---------------------------------------------------------------------

function render() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (G.mode === 'title') {
    drawTitleScreen(ctx, viewW, viewH, hasSave());
    return;
  }
  const cam = G.cam;
  const shakeX = cam.shake ? (Math.random() - 0.5) * cam.shake : 0;
  const shakeY = cam.shake ? (Math.random() - 0.5) * cam.shake : 0;

  ctx.fillStyle = '#155a75';
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.save();
  ctx.translate(viewW / 2, viewH / 2);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x + shakeX, -cam.y + shakeY);

  drawWorld(ctx, viewW, viewH);
  const obj = currentObjective();
  if (obj && obj.x !== null && obj.x !== undefined) {
    drawObjectiveMarker(ctx, obj.x, obj.y);
  }
  drawSkids(ctx);
  for (const car of G.cars) drawCar(ctx, car);
  for (const ped of G.peds) {
    if (ped.state !== 'passenger') drawPed(ctx, ped);
  }
  drawPlayer(ctx);
  drawBullets(ctx);
  drawParticles(ctx);
  ctx.restore();

  drawHUD(ctx, viewW, viewH);
  if (G.mode === 'paused') drawPauseOverlay(ctx, viewW, viewH);
  if (G.mode === 'busted') drawEndOverlay(ctx, viewW, viewH, 'busted');
  if (G.mode === 'wasted') drawEndOverlay(ctx, viewW, viewH, 'wasted');
}

// --- Loop -------------------------------------------------------------------------

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000 || 0.016);
  last = now;
  G.time += dt;

  // Mouse position in world space, for aiming.
  const cam = G.cam;
  G.mouse.worldX = cam.x + (G.mouse.x - viewW / 2) / cam.zoom;
  G.mouse.worldY = cam.y + (G.mouse.y - viewH / 2) / cam.zoom;

  handleModeKeys();
  if (G.mode === 'play' && !G.staging) {
    G.playTime += dt;
    update(dt);
  }
  updateEffects(G.staging ? 0 : dt);
  render();
  input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.PALMARIS = G;
