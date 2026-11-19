// On-foot gunplay: aim with the mouse, fire with the button. Bullets are
// fast tracers that can drop pedestrians, wreck cars and — when they hit a
// police interceptor — bring real heat.

import { G, commitCrime } from './state.js';
import { buildingAt } from './city-map.js';
import { distance } from './random.js';
import { muzzleFlash, sparks, explosion, burst } from './effects.js';
import { scarePeds, knockDown } from './pedestrians.js';
import { playShot, playHit, playCrash } from './audio.js';

const FIRE_INTERVAL = 0.13;
const BULLET_SPEED = 980;

export function updateCombat(dt) {
  const p = G.player;
  p.fireCooldown -= dt;

  if (!p.car && G.mouse.down && p.fireCooldown <= 0 && G.mode === 'play') {
    p.fireCooldown = FIRE_INTERVAL;
    const angle = Math.atan2(G.mouse.worldY - p.y, G.mouse.worldX - p.x);
    const spread = (Math.random() - 0.5) * 0.05;
    const bx = p.x + Math.cos(angle) * 14;
    const by = p.y + Math.sin(angle) * 14;
    G.bullets.push({
      x: bx, y: by,
      vx: Math.cos(angle + spread) * BULLET_SPEED,
      vy: Math.sin(angle + spread) * BULLET_SPEED,
      life: 0.55,
    });
    muzzleFlash(bx, by, angle);
    playShot();
    scarePeds(p.x, p.y, 250);
    commitCrime(0.34);
    G.stats.shots++;
  }

  for (let i = G.bullets.length - 1; i >= 0; i--) {
    const b = G.bullets[i];
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    let spent = b.life <= 0;
    if (!spent && buildingAt(b.x, b.y)) {
      sparks(b.x, b.y, Math.atan2(-b.vy, -b.vx));
      spent = true;
    }
    if (!spent) {
      for (const car of G.cars) {
        if (distance(b.x, b.y, car.x, car.y) < 27) {
          damageCarByShot(car, b);
          spent = true;
          break;
        }
      }
    }
    if (!spent) {
      for (const ped of G.peds) {
        if (ped.state === 'down' || ped.state === 'passenger') continue;
        if (distance(b.x, b.y, ped.x, ped.y) < 11) {
          ped.hp -= 1;
          G.stats.hits++;
          playHit();
          burst(ped.x, ped.y, { count: 5, color: '#c0392b', speed: 90, life: 0.3, size: 2.4 });
          if (ped.hp <= 0) {
            knockDown(ped);
            commitCrime(1);
          } else {
            ped.state = 'flee';
            ped.threatX = G.player.x;
            ped.threatY = G.player.y;
            ped.wait = 2.6;
          }
          spent = true;
          break;
        }
      }
    }
    if (spent) G.bullets.splice(i, 1);
  }
}

function damageCarByShot(car, bullet) {
  sparks(bullet.x, bullet.y, Math.atan2(-bullet.vy, -bullet.vx));
  playHit();
  G.stats.hits++;
  if (car.dead) return;
  car.hp -= 22;
  if (car.kind === 'police') commitCrime(0.5);
  if (car.hp <= 0) {
    car.hp = 0;
    car.dead = true;
    explosion(car.x, car.y);
    playCrash(1);
    commitCrime(1);
    scarePeds(car.x, car.y, 320);
  }
}

export function drawBullets(ctx) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,224,138,0.9)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  for (const b of G.bullets) {
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - b.vx * 0.016, b.y - b.vy * 0.016);
  }
  ctx.stroke();
  ctx.restore();
}
