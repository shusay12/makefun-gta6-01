// Drawing Palmaris: sea, beach, park, roads with markings, buildings with
// long late-day shadows, palms and beach umbrellas. Pure rendering — it
// reads the city data and the camera, and never changes game state.

import { WORLD_W, WORLD_H, BEACH_Y, PALETTE } from './config.js';
import {
  AVENUES, STREETS, BUILDINGS, PLAZAS, PALMS, UMBRELLAS, PARK,
} from './city-map.js';
import { mulberry32 } from './random.js';
import { G } from './state.js';

const HALF_ROAD = 60;

export function viewRect(cam, viewW, viewH) {
  const w = viewW / cam.zoom;
  const h = viewH / cam.zoom;
  return { x: cam.x - w / 2, y: cam.y - h / 2, w, h };
}

function visible(rect, x, y, w, h) {
  return x + w >= rect.x && x <= rect.x + rect.w && y + h >= rect.y && y <= rect.y + rect.h;
}

export function drawWorld(ctx, viewW, viewH) {
  const cam = G.cam;
  const rect = viewRect(cam, viewW, viewH);

  // Sea everywhere outside the island.
  const seaGrad = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  seaGrad.addColorStop(0, PALETTE.water);
  seaGrad.addColorStop(1, PALETTE.waterDeep);
  ctx.fillStyle = seaGrad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  // Sparkle on the water.
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  const sparkleSeed = Math.floor(G.time * 2);
  for (let i = 0; i < 26; i++) {
    const sx = rect.x + ((i * 613 + sparkleSeed * 197) % Math.max(1, Math.floor(rect.w)));
    const sy = rect.y + ((i * 389 + sparkleSeed * 131) % Math.max(1, Math.floor(rect.h)));
    if (sx > 0 && sx < WORLD_W && sy > 0 && sy < WORLD_H) continue;
    ctx.fillRect(sx, sy, 14, 2);
  }

  // Island base: warm pavement.
  ctx.fillStyle = PALETTE.sidewalk;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  // Beach along the south edge, with a foam line where it meets the sea.
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(0, BEACH_Y, WORLD_W, WORLD_H - BEACH_Y);
  ctx.fillStyle = PALETTE.sandDark;
  for (let x = 0; x < WORLD_W; x += 90) {
    ctx.fillRect(x, WORLD_H - 8, 46, 3);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillRect(0, WORLD_H - 2, WORLD_W, 2);

  // The park: lawn, a pond and crossing paths.
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(PARK.x, PARK.y, PARK.w, PARK.h);
  ctx.fillStyle = PALETTE.grassDark;
  ctx.fillRect(PARK.x + 26, PARK.y + 26, PARK.w - 52, PARK.h - 52);
  ctx.fillStyle = PALETTE.parkPath;
  ctx.fillRect(PARK.x, PARK.y + PARK.h / 2 - 13, PARK.w, 26);
  ctx.fillRect(PARK.x + PARK.w / 2 - 13, PARK.y, 26, PARK.h);
  ctx.fillStyle = PALETTE.water;
  ctx.beginPath();
  ctx.ellipse(PARK.x + PARK.w * 0.72, PARK.y + PARK.h * 0.3, 52, 34, 0, 0, Math.PI * 2);
  ctx.fill();

  // Plazas and open lots.
  ctx.fillStyle = PALETTE.plaza;
  for (const p of PLAZAS) {
    if (visible(rect, p.x, p.y, p.w, p.h)) ctx.fillRect(p.x, p.y, p.w, p.h);
  }

  drawRoads(ctx, rect);
  drawBuildings(ctx, rect);
  drawPalms(ctx, rect);
  drawUmbrellas(ctx, rect);
}

function drawRoads(ctx, rect) {
  ctx.fillStyle = PALETTE.asphalt;
  for (const ax of AVENUES) {
    if (ax + HALF_ROAD >= rect.x && ax - HALF_ROAD <= rect.x + rect.w) {
      ctx.fillRect(ax - HALF_ROAD, 0, HALF_ROAD * 2, WORLD_H);
    }
  }
  for (const sy of STREETS) {
    if (sy + HALF_ROAD >= rect.y && sy - HALF_ROAD <= rect.y + rect.h) {
      ctx.fillRect(0, sy - HALF_ROAD, WORLD_W, HALF_ROAD * 2);
    }
  }
  // Kerbs.
  ctx.fillStyle = PALETTE.kerb;
  for (const ax of AVENUES) {
    ctx.fillRect(ax - HALF_ROAD - 4, 0, 4, WORLD_H);
    ctx.fillRect(ax + HALF_ROAD, 0, 4, WORLD_H);
  }
  for (const sy of STREETS) {
    ctx.fillRect(0, sy - HALF_ROAD - 4, WORLD_W, 4);
    ctx.fillRect(0, sy + HALF_ROAD, WORLD_W, 4);
  }
  // Dashed centre lines.
  ctx.fillStyle = PALETTE.laneMark;
  for (const ax of AVENUES) {
    for (let y = 12; y < WORLD_H; y += 44) {
      if (STREETS.some((sy) => Math.abs(sy - y) < 78)) continue;
      ctx.fillRect(ax - 2, y, 4, 24);
    }
  }
  for (const sy of STREETS) {
    for (let x = 12; x < WORLD_W; x += 44) {
      if (AVENUES.some((ax) => Math.abs(ax - x) < 78)) continue;
      ctx.fillRect(x, sy - 2, 24, 4);
    }
  }
  // Crosswalks at intersections.
  ctx.fillStyle = 'rgba(245,238,218,0.8)';
  for (const ax of AVENUES) {
    for (const sy of STREETS) {
      if (!visible(rect, ax - HALF_ROAD, sy - HALF_ROAD, HALF_ROAD * 2, HALF_ROAD * 2)) continue;
      for (let i = -2; i <= 2; i++) {
        ctx.fillRect(ax + i * 20 - 6, sy - HALF_ROAD + 4, 12, 16);
        ctx.fillRect(ax + i * 20 - 6, sy + HALF_ROAD - 20, 12, 16);
        ctx.fillRect(ax - HALF_ROAD + 4, sy + i * 20 - 6, 16, 12);
        ctx.fillRect(ax + HALF_ROAD - 20, sy + i * 20 - 6, 16, 12);
      }
    }
  }
}

function drawBuildings(ctx, rect) {
  for (const b of BUILDINGS) {
    if (!visible(rect, b.x - 20, b.y - 20, b.w + 44, b.h + 48)) continue;
    const lift = 3 + b.floors * 2.4;
    // Long shadow to the south-east, then the wall extrusion.
    ctx.fillStyle = PALETTE.shadow;
    ctx.fillRect(b.x + lift + 5, b.y + lift + 7, b.w, b.h);
    ctx.fillStyle = shade(b.roof, -26);
    ctx.fillRect(b.x + lift * 0.45, b.y + lift * 0.6, b.w, b.h);
    // Roof.
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = shade(b.roof, -48);
    ctx.lineWidth = 3;
    ctx.strokeRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
    // Rooftop clutter, placed by the building's own seed.
    const rng = mulberry32(Math.floor(b.seed * 100000) + 11);
    ctx.fillStyle = shade(b.roof, -18);
    const units = 1 + Math.floor(rng() * 3);
    for (let i = 0; i < units; i++) {
      const uw = 14 + rng() * 22;
      const uh = 12 + rng() * 18;
      ctx.fillRect(b.x + 12 + rng() * (b.w - uw - 24), b.y + 12 + rng() * (b.h - uh - 24), uw, uh);
    }
    if (b.name) {
      ctx.fillStyle = 'rgba(23,37,43,0.85)';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.name, b.x + b.w / 2, b.y + b.h / 2 + 5);
    }
  }
}

function drawPalms(ctx, rect) {
  for (const palm of PALMS) {
    if (!visible(rect, palm.x - 30, palm.y - 30, 60, 60)) continue;
    ctx.save();
    ctx.translate(palm.x, palm.y);
    ctx.scale(palm.s, palm.s);
    ctx.fillStyle = 'rgba(30,30,34,0.25)';
    ctx.beginPath();
    ctx.ellipse(5, 6, 13, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7a5230';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(3, -5);
    ctx.stroke();
    ctx.strokeStyle = '#3e9c4f';
    ctx.lineWidth = 2.6;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + palm.x * 0.01;
      ctx.beginPath();
      ctx.moveTo(3, -5);
      ctx.quadraticCurveTo(
        3 + Math.cos(a) * 11, -5 + Math.sin(a) * 11 - 3,
        3 + Math.cos(a) * 19, -5 + Math.sin(a) * 19 + 4,
      );
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawUmbrellas(ctx, rect) {
  for (const u of UMBRELLAS) {
    if (!visible(rect, u.x - 18, u.y - 18, 36, 36)) continue;
    ctx.fillStyle = 'rgba(30,30,34,0.22)';
    ctx.beginPath();
    ctx.ellipse(u.x + 4, u.y + 5, 13, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = u.color;
    ctx.beginPath();
    ctx.arc(u.x, u.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(u.x, u.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// The glowing pillar of light that marks the current objective.
export function drawObjectiveMarker(ctx, x, y, color = '#ffc93c') {
  const pulse = 1 + Math.sin(G.time * 4) * 0.12;
  ctx.save();
  const grad = ctx.createLinearGradient(0, y - 190, 0, y);
  grad.addColorStop(0, 'rgba(255,201,60,0)');
  grad.addColorStop(1, 'rgba(255,201,60,0.4)');
  ctx.fillStyle = color === '#ffc93c' ? grad : grad;
  ctx.fillRect(x - 9, y - 190, 18, 190);
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, 24 * pulse, 10 * pulse, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.ellipse(x, y, 40 * pulse, 17 * pulse, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Darken or lighten a #rrggbb colour by an amount.
export function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (n & 0xff) + amount));
  return `rgb(${r},${g},${b})`;
}
