// The minimap: Palmaris in miniature — roads, beach and park, with blips
// for the player, the police, traffic and the gold objective marker.

import { G } from './state.js';
import { WORLD_W, WORLD_H, BEACH_Y } from './config.js';
import { AVENUES, STREETS, PARK } from './city-map.js';
import { currentObjective } from './missions.js';

export function drawMinimap(ctx, x, y, w, h) {
  const sx = w / WORLD_W;
  const sy = h / WORLD_H;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  ctx.fillStyle = '#20313a';
  ctx.fillRect(x, y, w, h);
  // Beach and park.
  ctx.fillStyle = '#c9ae72';
  ctx.fillRect(x, y + BEACH_Y * sy, w, (WORLD_H - BEACH_Y) * sy);
  ctx.fillStyle = '#4e7d3a';
  ctx.fillRect(x + PARK.x * sx, y + PARK.y * sy, PARK.w * sx, PARK.h * sy);
  // Roads.
  ctx.strokeStyle = '#8d99a3';
  ctx.lineWidth = 3;
  for (const ax of AVENUES) {
    ctx.beginPath();
    ctx.moveTo(x + ax * sx, y);
    ctx.lineTo(x + ax * sx, y + h);
    ctx.stroke();
  }
  for (const st of STREETS) {
    ctx.beginPath();
    ctx.moveTo(x, y + st * sy);
    ctx.lineTo(x + w, y + st * sy);
    ctx.stroke();
  }

  // Traffic as faint dots.
  ctx.fillStyle = 'rgba(230,230,230,0.55)';
  for (const car of G.cars) {
    if (car.kind === 'police' || car.kind === 'player') continue;
    ctx.fillRect(x + car.x * sx - 1.4, y + car.y * sy - 1.4, 2.8, 2.8);
  }
  // Police blips flash blue/red.
  const phase = Math.floor(G.time * 3.4) % 2 === 0;
  for (const car of G.cars) {
    if (car.kind !== 'police') continue;
    ctx.fillStyle = phase ? '#4ea8ff' : '#e63946';
    ctx.beginPath();
    ctx.arc(x + car.x * sx, y + car.y * sy, 3.4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Objective marker, pulsing gold.
  const obj = currentObjective();
  if (obj && obj.x !== null && obj.x !== undefined) {
    const r = 4.4 + Math.sin(G.time * 5) * 1.3;
    ctx.fillStyle = '#ffc93c';
    ctx.beginPath();
    ctx.arc(x + obj.x * sx, y + obj.y * sy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,201,60,0.6)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(x + obj.x * sx, y + obj.y * sy, r + 3.4, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Player arrow.
  const p = G.player;
  ctx.save();
  ctx.translate(x + p.x * sx, y + p.y * sy);
  ctx.rotate(p.angle);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(-4.4, -4);
  ctx.lineTo(-4.4, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.restore();
  // Frame and north mark.
  ctx.strokeStyle = 'rgba(10,18,22,0.75)';
  ctx.lineWidth = 2.4;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('N', x + w - 9, y + 12);
}
