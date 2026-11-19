// Palmaris citizens: they stroll the pavements and the park, run from
// trouble, and — if knocked down — are cleared away and replaced so the
// streets never empty.

import { G } from './state.js';
import { WORLD_W, WORLD_H } from './config.js';
import { randomSidewalkPoint, collideBuildings, buildingAt } from './city-map.js';
import { pick, randRange, clamp, distance } from './random.js';

const SHIRTS = ['#ff8fab', '#ffd166', '#06d6a0', '#4ea8ff', '#f4f1de', '#e07a5f', '#b8b8ff', '#ffffff'];
const SKINS = ['#f2c09a', '#c68863', '#8d5524', '#ffdbac', '#e0ac69'];

export function makePed(x, y, rng) {
  return {
    x, y, angle: rng() * Math.PI * 2,
    speed: randRange(rng, 48, 82),
    state: 'walk', // 'walk' | 'flee' | 'down' | 'passenger'
    tx: x, ty: y,
    wait: 0,
    hp: 2,
    downAt: 0,
    walkCycle: rng() * 6,
    shirt: pick(rng, SHIRTS),
    skin: pick(rng, SKINS),
    threatX: 0, threatY: 0,
  };
}

export function spawnPeds(rng, count) {
  for (let i = 0; i < count; i++) {
    const p = randomSidewalkPoint(rng);
    const ped = makePed(p.x, p.y, rng);
    chooseTarget(ped, rng);
    G.peds.push(ped);
  }
}

function chooseTarget(ped, rng) {
  for (let tries = 0; tries < 6; tries++) {
    const tx = clamp(ped.x + randRange(rng, -340, 340), 24, WORLD_W - 24);
    const ty = clamp(ped.y + randRange(rng, -340, 340), 24, WORLD_H - 24);
    if (!buildingAt(tx, ty)) {
      ped.tx = tx;
      ped.ty = ty;
      return;
    }
  }
  const p = randomSidewalkPoint(rng);
  ped.tx = p.x;
  ped.ty = p.y;
}

export function scarePeds(x, y, radius) {
  for (const ped of G.peds) {
    if (ped.state !== 'walk') continue;
    if (distance(ped.x, ped.y, x, y) < radius) {
      ped.state = 'flee';
      ped.threatX = x;
      ped.threatY = y;
      ped.wait = 2.6;
    }
  }
}

export function knockDown(ped) {
  if (ped.state === 'down') return;
  ped.state = 'down';
  ped.downAt = G.time;
}

export function updatePeds(dt, rng) {
  for (const ped of G.peds) {
    if (ped.state === 'passenger') continue;
    if (ped.state === 'down') {
      if (G.time - ped.downAt > 7) {
        // Cleared away; respawn somewhere quiet to keep the city alive.
        const p = randomSidewalkPoint(rng);
        ped.x = p.x;
        ped.y = p.y;
        ped.state = 'walk';
        ped.hp = 2;
        chooseTarget(ped, rng);
      }
      continue;
    }
    let speed = ped.speed;
    if (ped.state === 'flee') {
      ped.wait -= dt;
      const away = Math.atan2(ped.y - ped.threatY, ped.x - ped.threatX);
      ped.tx = clamp(ped.x + Math.cos(away) * 260, 20, WORLD_W - 20);
      ped.ty = clamp(ped.y + Math.sin(away) * 260, 20, WORLD_H - 20);
      speed = 178;
      if (ped.wait <= 0) {
        ped.state = 'walk';
        chooseTarget(ped, rng);
      }
    } else if (distance(ped.x, ped.y, ped.tx, ped.ty) < 14) {
      if (ped.wait > 0) {
        ped.wait -= dt;
        continue;
      }
      if (rng() < 0.3) ped.wait = randRange(rng, 0.6, 2.4);
      chooseTarget(ped, rng);
      continue;
    }
    const targetAngle = Math.atan2(ped.ty - ped.y, ped.tx - ped.x);
    ped.angle = targetAngle;
    ped.x += Math.cos(ped.angle) * speed * dt;
    ped.y += Math.sin(ped.angle) * speed * dt;
    ped.walkCycle += dt * speed * 0.09;
    const fixed = collideBuildings(ped.x, ped.y, 10);
    if (fixed.x !== ped.x || fixed.y !== ped.y) {
      ped.x = fixed.x;
      ped.y = fixed.y;
      if (ped.state === 'walk') chooseTarget(ped, rng);
    }
  }
}

export function drawPed(ctx, ped) {
  ctx.save();
  ctx.translate(ped.x, ped.y);
  if (ped.state === 'down') {
    const fade = Math.max(0.25, 1 - (G.time - ped.downAt) / 8);
    ctx.globalAlpha = fade;
    ctx.rotate(ped.angle + Math.PI / 2);
    ctx.fillStyle = 'rgba(30,30,34,0.3)';
    ctx.beginPath();
    ctx.ellipse(1, 2, 13, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ped.shirt;
    ctx.fillRect(-11, -4, 15, 8);
    ctx.fillStyle = ped.skin;
    ctx.beginPath();
    ctx.arc(8, 0, 4.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  const step = Math.sin(ped.walkCycle) * 4;
  ctx.fillStyle = 'rgba(30,30,34,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(ped.angle);
  // Legs
  ctx.strokeStyle = '#37424a';
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-3, step);
  ctx.moveTo(0, 0);
  ctx.lineTo(-3, -step);
  ctx.stroke();
  // Body and head
  ctx.fillStyle = ped.shirt;
  ctx.beginPath();
  ctx.arc(0, 0, 6.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ped.skin;
  ctx.beginPath();
  ctx.arc(1.6, 0, 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
