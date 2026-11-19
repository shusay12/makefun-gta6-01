// Arcade driving for the player's car: throttle, steering, handbrake
// drifts, skid marks, and every collision the car can have — buildings,
// other cars and (regrettably) pedestrians.

import { G, commitCrime } from './state.js';
import { WORLD_W, WORLD_H } from './config.js';
import { collideBuildings } from './city-map.js';
import { CAR_TYPES } from './vehicles.js';
import { clamp, distance } from './random.js';
import * as input from './input.js';
import { addSkid, sparks, explosion } from './effects.js';
import { knockDown, scarePeds } from './pedestrians.js';
import { hurtPlayer } from './player.js';
import { playCrash, setEngine } from './audio.js';

export function updateDriving(dt) {
  const p = G.player;
  const car = p.car;
  if (!car) {
    setEngine(false);
    return;
  }
  const def = CAR_TYPES[car.type];

  if (car.dead) {
    car.speed = 0;
    G.prompt = 'Wrecked. Press E to get out and find another ride';
    setEngine(false);
    return;
  }

  const throttle = input.down('KeyW', 'ArrowUp');
  const brake = input.down('KeyS', 'ArrowDown');
  const left = input.down('KeyA', 'ArrowLeft');
  const right = input.down('KeyD', 'ArrowRight');
  const handbrake = input.down('Space');

  if (throttle) car.speed += def.accel * dt;
  if (brake) {
    if (car.speed > 24) car.speed -= 460 * dt;
    else car.speed = Math.max(-120, car.speed - 200 * dt);
  }
  // Drag and rolling resistance.
  car.speed -= car.speed * 0.55 * dt;
  if (!throttle && !brake) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 26 * dt);
  if (handbrake) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 300 * dt);
  car.speed = clamp(car.speed, -120, def.maxSpeed);

  const steerInput = (left ? -1 : 0) + (right ? 1 : 0);
  if (steerInput !== 0 && Math.abs(car.speed) > 4) {
    const grip = handbrake ? 1.65 : 1.0;
    const turnRate = clamp(Math.abs(car.speed) / 130, 0.25, 1.5) * 1.55 * grip;
    car.angle += steerInput * turnRate * dt * Math.sign(car.speed);
  }

  const prevSpeed = car.speed;
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.x = clamp(car.x, 26, WORLD_W - 26);
  car.y = clamp(car.y, 26, WORLD_H - 26);

  // Burnouts and drifts leave marks.
  const slipping = handbrake && Math.abs(car.speed) > 90 && steerInput !== 0;
  const burningOut = throttle && Math.abs(prevSpeed) < 30 && Math.abs(car.speed) >= 30;
  if (slipping || burningOut) {
    addSkid(car.x - Math.cos(car.angle) * 14 + Math.cos(car.angle - Math.PI / 2) * 9, car.y - Math.sin(car.angle) * 14 + Math.sin(car.angle - Math.PI / 2) * 9, car.angle);
    addSkid(car.x - Math.cos(car.angle) * 14 - Math.cos(car.angle - Math.PI / 2) * 9, car.y - Math.sin(car.angle) * 14 - Math.sin(car.angle - Math.PI / 2) * 9, car.angle);
  }

  collideWithBuildings(car, prevSpeed);
  collideWithCars(car);
  collideWithPeds(car);

  const speedNow = Math.abs(car.speed);
  G.stats.topSpeed = Math.max(G.stats.topSpeed, speedNow);
  G.stats.distance += speedNow * dt;
  setEngine(true, clamp(speedNow / def.maxSpeed, 0, 1));

  if (speedNow > 150) scarePeds(car.x, car.y, 90);
}

function damageCar(car, amount) {
  if (car.dead) return;
  car.hp -= amount;
  if (car.hp <= 0) {
    car.hp = 0;
    car.dead = true;
    explosion(car.x, car.y);
    playCrash(1);
  }
}

function collideWithBuildings(car, prevSpeed) {
  const fixed = collideBuildings(car.x, car.y, 24);
  if (fixed.x !== car.x || fixed.y !== car.y) {
    car.x = fixed.x;
    car.y = fixed.y;
    const impact = Math.abs(prevSpeed);
    if (impact > 120) {
      damageCar(car, (impact - 110) / 14);
      hurtPlayer((impact - 130) / 26);
      sparks(car.x + Math.cos(car.angle) * 22, car.y + Math.sin(car.angle) * 22, car.angle + Math.PI);
      playCrash(clamp(impact / 320, 0.3, 1));
      G.cam.shake = Math.min(13, G.cam.shake + impact / 42);
    }
    car.speed = -prevSpeed * 0.22;
  }
}

function collideWithCars(car) {
  for (const other of G.cars) {
    if (other === car) continue;
    const d = distance(car.x, car.y, other.x, other.y);
    if (d >= 46 || d === 0) continue;
    const nx = (other.x - car.x) / d;
    const ny = (other.y - car.y) / d;
    const overlap = 46 - d;
    car.x -= nx * overlap * 0.55;
    car.y -= ny * overlap * 0.55;
    if (other.kind === 'police') {
      other.x += nx * overlap * 0.45;
      other.y += ny * overlap * 0.45;
    }
    const impact = Math.abs(car.speed);
    if (impact > 55) {
      damageCar(other, impact / 16);
      damageCar(car, impact / 30);
      sparks((car.x + other.x) / 2, (car.y + other.y) / 2, Math.atan2(ny, nx));
      playCrash(clamp(impact / 300, 0.3, 1));
      G.cam.shake = Math.min(12, G.cam.shake + impact / 46);
      if (other.kind === 'police') commitCrime(0.5);
      car.speed *= 0.42;
    } else {
      car.speed *= 0.7;
    }
  }
}

function collideWithPeds(car) {
  if (Math.abs(car.speed) < 26) return;
  for (const ped of G.peds) {
    if (ped.state === 'down' || ped.state === 'passenger') continue;
    if (distance(car.x, car.y, ped.x, ped.y) < 27) {
      knockDown(ped);
      commitCrime(1);
      playCrash(0.5);
      G.cam.shake = Math.min(10, G.cam.shake + 3);
      car.speed *= 0.82;
    }
  }
}
