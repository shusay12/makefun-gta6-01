// Cars: types, spawning, traffic that drives the grid on its own, and the
// shared drawing and damage code every car (traffic, parked, police, the
// player's ride) uses.

import { G } from './state.js';
import { AVENUES, STREETS, PLACES, randomRoadPoint } from './city-map.js';
import { WORLD_W, WORLD_H, PALETTE } from './config.js';
import { mulberry32, pick, randRange, clamp } from './random.js';
import { smokePuff } from './effects.js';

export const CAR_TYPES = {
  hatch: { name: 'Pico Hatch', maxSpeed: 300, accel: 230, hp: 80, colors: ['#e07a5f', '#81b29a', '#f2cc8f', '#7fb3d5'] },
  sedan: { name: 'Meridian Sedan', maxSpeed: 335, accel: 250, hp: 100, colors: ['#c0c6ce', '#5d6d7e', '#922b21', '#1a5276'] },
  coupe: { name: 'Vela Coupe', maxSpeed: 385, accel: 300, hp: 95, colors: ['#2e86c1', '#f39c12', '#8e44ad', '#ecf0f1'] },
  sport: { name: 'Solana GT', maxSpeed: 445, accel: 360, hp: 110, colors: ['#e63946', '#ffc93c', '#ff7a59', '#11151c'] },
  van: { name: 'Cargo Van', maxSpeed: 275, accel: 200, hp: 140, colors: ['#eaeded', '#aab7b8', '#f5b041'] },
  taxi: { name: 'Palmaris Cab', maxSpeed: 330, accel: 255, hp: 100, colors: ['#ffc93c'] },
  police: { name: 'PPD Interceptor', maxSpeed: 415, accel: 335, hp: 150, colors: ['#f4f6f7'] },
};

let nextCarId = 1;

export function makeCar(x, y, angle, type, kind, rng) {
  const def = CAR_TYPES[type];
  return {
    id: nextCarId++,
    x, y, angle, speed: 0,
    type, kind, // 'traffic' | 'parked' | 'police' | 'mission'
    color: pick(rng, def.colors),
    hp: def.hp, maxHp: def.hp,
    dead: false, smokeAt: 0,
    road: null, along: 0, dir: 1, turnCooldown: 0,
    cruise: randRange(rng, 0.55, 0.8), // share of max speed traffic aims for
  };
}

// Lane offset from the road centre for a direction of travel.
function laneOffset(dir) {
  return dir > 0 ? 27 : -27;
}

export function placeOnRoad(car, point) {
  if (point.vertical) {
    car.road = { kind: 'avenue', at: point.x };
    car.along = point.y;
    car.dir = Math.random() < 0.5 ? 1 : -1;
  } else {
    car.road = { kind: 'street', at: point.y };
    car.along = point.x;
    car.dir = Math.random() < 0.5 ? 1 : -1;
  }
  syncCarToRoad(car);
}

function syncCarToRoad(car) {
  if (car.road.kind === 'avenue') {
    car.x = car.road.at + laneOffset(car.dir);
    car.y = car.along;
    car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  } else {
    car.x = car.along;
    car.y = car.road.at + laneOffset(car.dir);
    car.angle = car.dir > 0 ? 0 : Math.PI;
  }
}

export function spawnTraffic(rng, count) {
  const types = ['hatch', 'sedan', 'sedan', 'coupe', 'van', 'taxi', 'sport'];
  for (let i = 0; i < count; i++) {
    const car = makeCar(0, 0, 0, pick(rng, types), 'traffic', rng);
    placeOnRoad(car, randomRoadPoint(rng));
    car.speed = CAR_TYPES[car.type].maxSpeed * car.cruise;
    G.cars.push(car);
  }
}

export function spawnParked(rng, count) {
  const spots = [
    ...PLACES && [{ x: 1560, y: 1130 }, { x: 1620, y: 1130 }],
  ];
  const types = ['hatch', 'sedan', 'coupe', 'van', 'sport'];
  for (let i = 0; i < count; i++) {
    const p = randomRoadPoint(rng);
    const car = makeCar(0, 0, 0, pick(rng, types), 'parked', rng);
    placeOnRoad(car, p);
    // Nudge parked cars to the kerb and stop them.
    if (car.road.kind === 'avenue') car.x = car.road.at + (car.dir > 0 ? 44 : -44);
    else car.y = car.road.at + (car.dir > 0 ? 44 : -44);
    car.speed = 0;
    G.cars.push(car);
  }
  // Two cars always wait outside the showroom.
  for (const s of spots) {
    const car = makeCar(s.x, s.y, Math.PI, 'coupe', 'parked', rng);
    G.cars.push(car);
  }
}

// Is anything solid just ahead of this car? Traffic brakes for it.
function obstacleAhead(car, lookAhead) {
  const fx = car.x + Math.cos(car.angle) * lookAhead;
  const fy = car.y + Math.sin(car.angle) * lookAhead;
  for (const other of G.cars) {
    if (other === car) continue;
    const dx = other.x - fx;
    const dy = other.y - fy;
    if (dx * dx + dy * dy < 34 * 34) return true;
  }
  const p = G.player;
  if (!p.car) {
    const dx = p.x - fx;
    const dy = p.y - fy;
    if (dx * dx + dy * dy < 30 * 30) return true;
  }
  for (const ped of G.peds) {
    if (ped.state === 'down') continue;
    const dx = ped.x - fx;
    const dy = ped.y - fy;
    if (dx * dx + dy * dy < 28 * 28) return true;
  }
  return false;
}

export function updateTraffic(dt, rng) {
  for (const car of G.cars) {
    if (car.kind !== 'traffic' || car.dead) continue;
    const def = CAR_TYPES[car.type];
    let target = def.maxSpeed * car.cruise;
    if (obstacleAhead(car, 74)) target = 0;
    else if (obstacleAhead(car, 120)) target *= 0.45;

    if (car.speed < target) car.speed = Math.min(target, car.speed + def.accel * dt);
    else car.speed = Math.max(target, car.speed - 420 * dt);

    car.along += car.speed * car.dir * dt;
    car.turnCooldown -= dt;

    const limit = car.road.kind === 'avenue' ? WORLD_H : WORLD_W;
    if (car.along < 70 || car.along > limit - 70) {
      car.dir *= -1;
      car.along = clamp(car.along, 70, limit - 70);
    }

    // At an intersection, sometimes turn onto the crossing road.
    const crossings = car.road.kind === 'avenue' ? STREETS : AVENUES;
    if (car.turnCooldown <= 0) {
      for (const cross of crossings) {
        if (Math.abs(car.along - cross) < 8 && rng() < 0.4) {
          const oldAt = car.road.at;
          car.road = car.road.kind === 'avenue'
            ? { kind: 'street', at: cross }
            : { kind: 'avenue', at: cross };
          car.along = oldAt;
          car.dir = rng() < 0.5 ? 1 : -1;
          car.turnCooldown = 2.5;
          break;
        }
      }
    }
    syncCarToRoad(car);
  }
}

// Smoke and fire for anything badly damaged; called for every car.
export function updateCarDamage(dt) {
  for (const car of G.cars) {
    if (car.hp < car.maxHp * 0.45 && G.time > car.smokeAt) {
      smokePuff(car.x, car.y, car.dead);
      car.smokeAt = G.time + (car.dead ? 0.16 : 0.3);
    }
  }
}

export function drawCar(ctx, car) {
  const def = CAR_TYPES[car.type];
  const isPolice = car.kind === 'police';
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  // Shadow
  ctx.fillStyle = PALETTE.shadow;
  ctx.fillRect(-20, -9, 46, 22);
  // Body
  ctx.fillStyle = car.dead ? '#3c3c40' : car.color;
  roundRect(ctx, -24, -12, 48, 24, 6);
  ctx.fill();
  // Nose shading
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.fillRect(12, -12, 12, 24);
  // Cabin and glass
  ctx.fillStyle = '#1d2b33';
  roundRect(ctx, -9, -9, 20, 18, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(160,220,240,0.75)';
  ctx.fillRect(7, -8, 4, 16);
  ctx.fillRect(-11, -8, 3, 16);
  if (isPolice) {
    ctx.fillStyle = PALETTE.policeBlue;
    ctx.fillRect(-16, -12, 10, 24);
    ctx.fillRect(14, -12, 8, 24);
    // Light bar, flashing
    const phase = Math.floor(G.time * 3.4) % 2 === 0;
    ctx.fillStyle = phase ? PALETTE.policeLight : '#4ea8ff';
    ctx.fillRect(-4, -7, 8, 6);
    ctx.fillStyle = phase ? '#4ea8ff' : PALETTE.policeLight;
    ctx.fillRect(-4, 1, 8, 6);
  }
  if (car.type === 'taxi') {
    ctx.fillStyle = '#17252b';
    ctx.fillRect(-3, -4, 7, 8);
  }
  if (car.type === 'sport') {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(-24, -12, 6, 24);
  }
  // Headlights
  ctx.fillStyle = '#fff6c9';
  ctx.fillRect(23, -9, 2.6, 5);
  ctx.fillRect(23, 4, 2.6, 5);
  // Wheels
  ctx.fillStyle = '#14161a';
  ctx.fillRect(-17, -14, 10, 4);
  ctx.fillRect(-17, 10, 10, 4);
  ctx.fillRect(9, -14, 10, 4);
  ctx.fillRect(9, 10, 10, 4);
  ctx.restore();
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// A deterministic rng for systems that must not disturb the world seed.
export const fxRng = mulberry32(4242);
