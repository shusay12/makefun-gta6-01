// Particles, tyre marks and screen shake: the juice that makes crashes,
// gunfire and burnouts read on screen (and in the screenshots).

import { G } from './state.js';

export function burst(x, y, opts = {}) {
  const {
    count = 10, color = '#ffd166', speed = 160, life = 0.5,
    size = 3, gravity = 0, spread = Math.PI * 2, angle = 0,
  } = opts;
  for (let i = 0; i < count; i++) {
    if (G.particles.length > 420) return;
    const a = angle + (Math.random() - 0.5) * spread;
    const s = speed * (0.35 + Math.random() * 0.85);
    G.particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: life * (0.6 + Math.random() * 0.7),
      maxLife: life,
      size: size * (0.6 + Math.random() * 0.8),
      color, gravity,
    });
  }
}

export function sparks(x, y, angle) {
  burst(x, y, { count: 9, color: '#ffcf5c', speed: 240, life: 0.32, size: 2.4, angle, spread: 1.5 });
}

export function smokePuff(x, y, dark = false) {
  G.particles.push({
    x: x + (Math.random() - 0.5) * 8,
    y: y + (Math.random() - 0.5) * 8,
    vx: (Math.random() - 0.5) * 22,
    vy: -34 - Math.random() * 26,
    life: 0.9 + Math.random() * 0.5,
    maxLife: 1.3,
    size: 7 + Math.random() * 7,
    color: dark ? 'rgba(40,40,44,0.5)' : 'rgba(230,230,230,0.55)',
    gravity: -18,
  });
}

export function muzzleFlash(x, y, angle) {
  burst(x, y, { count: 4, color: '#ffe08a', speed: 120, life: 0.09, size: 3.4, angle, spread: 0.7 });
}

export function explosion(x, y) {
  burst(x, y, { count: 34, color: '#ff8c42', speed: 320, life: 0.7, size: 5 });
  burst(x, y, { count: 22, color: '#e63946', speed: 210, life: 0.9, size: 6 });
  burst(x, y, { count: 16, color: '#3a3a40', speed: 90, life: 1.4, size: 9, gravity: -30 });
  G.cam.shake = Math.min(16, G.cam.shake + 11);
}

export function addSkid(x, y, angle) {
  G.skids.push({ x, y, angle, life: 7 });
  if (G.skids.length > 500) G.skids.splice(0, G.skids.length - 500);
}

export function updateEffects(dt) {
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const p = G.particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      G.particles.splice(i, 1);
      continue;
    }
    p.vy += (p.gravity || 0) * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  for (let i = G.skids.length - 1; i >= 0; i--) {
    G.skids[i].life -= dt;
    if (G.skids[i].life <= 0) G.skids.splice(i, 1);
  }
  G.cam.shake = Math.max(0, G.cam.shake - dt * 26);
}

// Skids are drawn under the cars; particles above them.
export function drawSkids(ctx) {
  for (const s of G.skids) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.5, s.life * 0.2);
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle);
    ctx.fillStyle = '#26262b';
    ctx.fillRect(-13, -3, 26, 6);
    ctx.restore();
  }
}

export function drawParticles(ctx) {
  for (const p of G.particles) {
    const t = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = Math.min(1, t * 1.6);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.6, p.size * t), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
