// The player on foot: walking, sprinting, taking damage, and the
// enter/exit-car interaction (stealing included). Driving itself lives in
// driving.js; this file only handles the character.

import { G, commitCrime } from './state.js';
import { WORLD_W, WORLD_H, PLAYER_RADIUS, PLAYER_WALK, PLAYER_SPRINT } from './config.js';
import { collideBuildings } from './city-map.js';
import { clamp, distance } from './random.js';
import * as input from './input.js';
import { scarePeds, knockDown } from './pedestrians.js';
import { playCrash } from './audio.js';

export function nearestCarWithin(x, y, radius) {
  let best = null;
  let bestD = radius;
  for (const car of G.cars) {
    if (car.dead) continue;
    const d = distance(x, y, car.x, car.y);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

function anyoneWatching(x, y, radius) {
  for (const ped of G.peds) {
    if (ped.state === 'walk' && distance(x, y, ped.x, ped.y) < radius) return true;
  }
  for (const car of G.cars) {
    if (car.kind === 'police' && distance(x, y, car.x, car.y) < radius + 60) return true;
  }
  return false;
}

export function enterCar(car) {
  const p = G.player;
  p.car = car;
  car.kind = 'player';
  car.speed = 0;
  G.stats.stolen++;
  // Stealing is a crime when someone sees it happen.
  if (anyoneWatching(car.x, car.y, 300)) {
    commitCrime(1);
    scarePeds(car.x, car.y, 190);
  }
  // A traffic driver bails out and runs.
  for (const ped of G.peds) {
    if (ped.state === 'passenger') continue;
  }
}

export function exitCar() {
  const p = G.player;
  if (!p.car) return;
  const car = p.car;
  car.kind = car.wasPolice ? 'police' : 'parked';
  if (car.kind === 'police' && car.dead) car.kind = 'parked';
  car.speed = 0;
  p.car = null;
  // Step out on the left side of the car.
  const side = car.angle - Math.PI / 2;
  p.x = clamp(car.x + Math.cos(side) * 30, 16, WORLD_W - 16);
  p.y = clamp(car.y + Math.sin(side) * 30, 16, WORLD_H - 16);
  const fixed = collideBuildings(p.x, p.y, PLAYER_RADIUS);
  p.x = fixed.x;
  p.y = fixed.y;
}

export function hurtPlayer(amount) {
  const p = G.player;
  p.health -= amount;
  p.hurtAt = G.time;
  if (p.health < 0) p.health = 0;
}

export function updatePlayer(dt) {
  const p = G.player;
  if (p.car) {
    p.x = p.car.x;
    p.y = p.car.y;
    p.angle = p.car.angle;
    if (input.pressed('KeyE')) exitCar();
    return;
  }

  let mx = 0;
  let my = 0;
  if (input.down('KeyW', 'ArrowUp')) my -= 1;
  if (input.down('KeyS', 'ArrowDown')) my += 1;
  if (input.down('KeyA', 'ArrowLeft')) mx -= 1;
  if (input.down('KeyD', 'ArrowRight')) mx += 1;
  const moving = mx !== 0 || my !== 0;
  const sprint = input.down('ShiftLeft', 'ShiftRight');
  const speed = sprint ? PLAYER_SPRINT : PLAYER_WALK;
  if (moving) {
    const len = Math.sqrt(mx * mx + my * my);
    mx /= len;
    my /= len;
    p.angle = Math.atan2(my, mx);
    p.x += mx * speed * dt;
    p.y += my * speed * dt;
    p.walkCycle += dt * (sprint ? 13 : 9.5);
    G.stats.distance += speed * dt;
  }
  p.speed = moving ? speed : 0;
  p.x = clamp(p.x, 14, WORLD_W - 14);
  p.y = clamp(p.y, 14, WORLD_H - 14);
  const fixed = collideBuildings(p.x, p.y, PLAYER_RADIUS);
  p.x = fixed.x;
  p.y = fixed.y;

  // Slow health recovery once the heat is off.
  if (G.time - p.hurtAt > 7 && p.health > 0 && p.health < 100) {
    p.health = Math.min(100, p.health + dt * 3.2);
  }

  // Interaction prompt + stealing.
  const near = nearestCarWithin(p.x, p.y, 52);
  if (near) {
    G.prompt = near.kind === 'police' ? 'Press E to steal the interceptor' : 'Press E to steal this car';
    if (input.pressed('KeyE')) enterCar(near);
  }

  // Shoving through a crowd is noticed.
  for (const ped of G.peds) {
    if (ped.state !== 'walk') continue;
    if (distance(p.x, p.y, ped.x, ped.y) < 15 && sprint && moving) {
      knockDown(ped);
      commitCrime(0.5);
      playCrash(0.4);
    }
  }
}

export function drawPlayer(ctx) {
  const p = G.player;
  if (p.car) return; // hidden inside the car
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(30,30,34,0.32)';
  ctx.beginPath();
  ctx.ellipse(0, 3, 9, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(p.angle);
  const step = Math.sin(p.walkCycle) * 4.4;
  ctx.strokeStyle = '#20303a';
  ctx.lineWidth = 3.6;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-3, step);
  ctx.moveTo(0, 0);
  ctx.lineTo(-3, -step);
  ctx.stroke();
  // Rio's coral shirt: the player must read at a glance.
  ctx.fillStyle = '#ff5a3c';
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8d5524';
  ctx.beginPath();
  ctx.arc(1.8, 0, 4.6, 0, Math.PI * 2);
  ctx.fill();
  // Direction tick.
  ctx.fillStyle = '#17252b';
  ctx.fillRect(6, -1.4, 5, 2.8);
  ctx.restore();

  // Hurt vignette pulse handled by HUD; low-health heartbeat ring here.
  if (p.health < 30 && G.mode === 'play') {
    ctx.save();
    ctx.strokeStyle = `rgba(230,57,70,${0.35 + Math.sin(G.time * 6) * 0.2})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 17, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
