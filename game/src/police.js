// The Palmaris PD: wanted heat that cools when you lie low, interceptors
// that hunt you across the grid, and the bust that ends a chase.

import { G, addCash } from './state.js';
import { BUST_SECONDS_FOOT, BUST_SECONDS_CAR } from './config.js';
import { PLACES, randomRoadPoint } from './city-map.js';
import { makeCar, placeOnRoad } from './vehicles.js';
import { mulberry32, clamp, distance } from './random.js';
import { sparks } from './effects.js';
import { playBusted, playCrash, setSiren } from './audio.js';
import { saveGame } from './save-game.js';

const spawnRng = mulberry32(777001);

export function policeCount() {
  return G.cars.filter((c) => c.kind === 'police').length;
}

function desiredPolice() {
  if (G.wanted <= 0) return 0;
  return Math.min(2 + G.wanted, 6);
}

function spawnPolice() {
  const p = G.player;
  for (let tries = 0; tries < 8; tries++) {
    const point = randomRoadPoint(spawnRng);
    const d = distance(point.x, point.y, p.x, p.y);
    if (d > 640 && d < 1150) {
      const cop = makeCar(0, 0, 0, 'police', 'police', spawnRng);
      placeOnRoad(cop, point);
      cop.speed = 240;
      G.cars.push(cop);
      return;
    }
  }
}

export function updateWanted(dt) {
  // Heat cools when no crime is fresh and no officer can see you.
  const anyCopNear = G.cars.some(
    (c) => c.kind === 'police' && distance(c.x, c.y, G.player.x, G.player.y) < 540,
  );
  if (G.heat > 0 && G.time - G.lastCrimeAt > 6 && !anyCopNear) {
    G.heat = Math.max(0, G.heat - dt / 6.5);
  }
  G.wanted = G.heat <= 0 ? 0 : Math.max(1, Math.ceil(G.heat - 1e-6));
  setSiren(G.wanted > 0 && G.mode === 'play');
}

export function updatePolice(dt) {
  const p = G.player;
  // Keep the fleet at strength while wanted; let it melt away otherwise.
  if (policeCount() < desiredPolice()) spawnPolice();
  for (let i = G.cars.length - 1; i >= 0; i--) {
    const cop = G.cars[i];
    if (cop.kind !== 'police') continue;
    if (G.wanted === 0 && distance(cop.x, cop.y, p.x, p.y) > 900) {
      G.cars.splice(i, 1);
    }
  }

  for (const cop of G.cars) {
    if (cop.kind !== 'police' || cop.dead) continue;
    const lead = p.car ? 0.45 : 0.12;
    const tx = p.x + Math.cos(p.angle) * (p.car ? p.car.speed * lead : 0);
    const ty = p.y + Math.sin(p.angle) * (p.car ? p.car.speed * lead : 0);
    const dist = distance(cop.x, cop.y, tx, ty);
    const desired = Math.atan2(ty - cop.y, tx - cop.x);
    let delta = desired - cop.angle;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    cop.angle += clamp(delta, -2.3 * dt, 2.3 * dt);

    const topSpeed = 300 + G.wanted * 26;
    let target = topSpeed;
    if (dist < 90) target = Math.max(60, dist * 2.4);
    if (cop.speed < target) cop.speed = Math.min(target, cop.speed + 320 * dt);
    else cop.speed = Math.max(target, cop.speed - 380 * dt);
    cop.x += Math.cos(cop.angle) * cop.speed * dt;
    cop.y += Math.sin(cop.angle) * cop.speed * dt;

    // Ramming the player's car.
    if (p.car && distance(cop.x, cop.y, p.car.x, p.car.y) < 44) {
      sparks(p.car.x, p.car.y, cop.angle);
      p.car.hp -= 14 * dt * 4;
      if (p.car.hp <= 0 && !p.car.dead) {
        p.car.hp = 0;
        p.car.dead = true;
      }
      playCrash(0.4);
      cop.speed *= 0.6;
    }
  }

  updateBust(dt);
}

function updateBust(dt) {
  const p = G.player;
  if (G.wanted === 0 || G.mode !== 'play') {
    p.bustMeter = 0;
    return;
  }
  let pinned = false;
  let limit = BUST_SECONDS_FOOT;
  if (p.car) {
    limit = BUST_SECONDS_CAR;
    if (Math.abs(p.car.speed) < 30) {
      pinned = G.cars.some(
        (c) => c.kind === 'police' && !c.dead && distance(c.x, c.y, p.car.x, p.car.y) < 78,
      );
    }
  } else if (p.speed < 62) {
    pinned = G.cars.some(
      (c) => c.kind === 'police' && !c.dead && distance(c.x, c.y, p.x, p.y) < 56,
    );
  }
  if (pinned) p.bustMeter += dt;
  else p.bustMeter = Math.max(0, p.bustMeter - dt * 1.6);
  if (p.bustMeter >= limit) bustPlayer();
}

export function bustPlayer() {
  const p = G.player;
  const fine = Math.floor(G.cash * 0.15);
  addCash(-fine);
  p.car = null;
  G.cars = G.cars.filter((c) => c.kind !== 'police');
  G.heat = 0;
  G.wanted = 0;
  p.bustMeter = 0;
  p.x = PLACES.station.x;
  p.y = PLACES.station.y + 60;
  p.health = Math.max(p.health, 55);
  G.mode = 'busted';
  playBusted();
  setSiren(false);
  saveGame();
}

export function wastedPlayer() {
  const p = G.player;
  const bill = Math.floor(G.cash * 0.1);
  addCash(-bill);
  p.car = null;
  G.heat = 0;
  G.wanted = 0;
  G.cars = G.cars.filter((c) => c.kind !== 'police');
  p.x = PLACES.hospital.x;
  p.y = PLACES.hospital.y + 60;
  p.health = 100;
  G.mode = 'wasted';
  setSiren(false);
  saveGame();
}
