// The city of Palmaris: a sun-soaked coastal grid invented for this game.
// Avenues run north-south, streets east-west; blocks between them hold
// buildings, one park, plazas and car parks. The south edge is beach.
// Everything here is data and pure helpers — no drawing, no state.

import { WORLD_W, WORLD_H, ROAD_W, BEACH_Y, ROOF_COLORS } from './config.js';
import { mulberry32, pick } from './random.js';

export const AVENUES = [260, 860, 1460, 2060, 2660, 3260]; // centre x of N-S roads
export const STREETS = [260, 860, 1460, 2060]; // centre y of E-W roads
const HALF = ROAD_W / 2;

// Named spots the story and systems use. Every one sits on a road or the
// beach — never inside a block — so a marker, a client or a respawn can
// never end up inside a building.
export const PLACES = {
  home: { x: 300, y: 1210, name: 'Palm Flats Rooms' },
  harbor: { x: 430, y: 287, name: 'Old Harbor' },
  heights: { x: 3233, y: 470, name: 'Coral Heights' },
  strip: { x: 1487, y: 1790, name: 'Avenida del Sol' },
  garage: { x: 2990, y: 2033, name: 'Marina Garage' },
  hideout: { x: 300, y: 1790, name: 'Palm Flats Hideout' },
  showroom: { x: 1487, y: 1100, name: 'Solana Motors Showroom' },
  dock: { x: 3300, y: 2520, name: 'East Dock Crane' },
  hospital: { x: 2350, y: 2033, name: 'Palmaris General' },
  station: { x: 2350, y: 287, name: 'Palmaris PD' },
  parkGate: { x: 1750, y: 1487, name: 'Palmaris Green' },
  northGate: { x: 3260, y: 170, name: 'North Gate' },
};

export const PARK = { x: 1520, y: 920, w: 480, h: 480 };

// --- Buildings -----------------------------------------------------------

const BLOCK_COLS = [[0, 200], [320, 800], [920, 1400], [1520, 2000], [2120, 2600], [2720, 3200], [3320, 3600]];
const BLOCK_ROWS = [[0, 200], [320, 800], [920, 1400], [1520, 2000], [2120, 2380]];

function buildCity() {
  const rng = mulberry32(20261117);
  const buildings = [];
  const plazas = [];
  for (const [cx0, cx1] of BLOCK_COLS) {
    for (const [ry0, ry1] of BLOCK_ROWS) {
      const inPark = cx0 === PARK.x && ry0 === PARK.y;
      if (inPark) continue;
      const inset = 30;
      const bx = cx0 + inset;
      const by = ry0 + inset;
      const bw = cx1 - cx0 - inset * 2;
      const bh = ry1 - ry0 - inset * 2;
      if (bw < 90 || bh < 90) {
        plazas.push({ x: bx, y: by, w: bw, h: bh });
        continue;
      }
      // Subdivide the block into a 2x2 of lots; some lots stay open.
      const lotW = (bw - 18) / 2;
      const lotH = (bh - 18) / 2;
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          if (rng() < 0.18) continue; // open lot: parking or plaza
          const w = lotW * (0.78 + rng() * 0.2);
          const h = lotH * (0.78 + rng() * 0.2);
          buildings.push({
            x: bx + i * (lotW + 18) + (lotW - w) / 2,
            y: by + j * (lotH + 18) + (lotH - h) / 2,
            w, h,
            floors: 1 + Math.floor(rng() * 6),
            roof: pick(rng, ROOF_COLORS),
            seed: rng(),
          });
        }
      }
    }
  }
  // Landmarks: single named buildings with signs.
  const landmark = (x, y, w, h, floors, name) => {
    buildings.push({ x, y, w, h, floors, roof: '#f4ead2', seed: 0.5, name });
  };
  landmark(2780, 980, 340, 300, 9, 'HOTEL SOLANA');
  landmark(980, 380, 340, 300, 3, 'PALMARIS MALL');
  landmark(380, 380, 380, 260, 2, 'HARBOR WAREHOUSE');
  landmark(2180, 380, 340, 280, 4, 'PALMARIS PD');
  landmark(2180, 1580, 340, 280, 5, 'PALMARIS GENERAL');
  landmark(1580, 980, 300, 240, 2, 'SOLANA MOTORS');
  return { buildings, plazas };
}

const city = buildCity();
export const BUILDINGS = city.buildings;
export const PLAZAS = city.plazas;

// --- Palms and beach props ------------------------------------------------

function buildPalms() {
  const rng = mulberry32(977);
  const palms = [];
  for (const ax of AVENUES) {
    for (let y = 90; y < WORLD_H - 200; y += 170) {
      if (STREETS.some((sy) => Math.abs(sy - y) < 110)) continue;
      palms.push({ x: ax - HALF - 16, y: y + rng() * 30, s: 0.85 + rng() * 0.4 });
      palms.push({ x: ax + HALF + 16, y: y + 80 + rng() * 30, s: 0.85 + rng() * 0.4 });
    }
  }
  for (let x = 120; x < WORLD_W - 80; x += 150) {
    palms.push({ x, y: BEACH_Y + 46 + rng() * 30, s: 0.9 + rng() * 0.5 });
  }
  return palms;
}

export const PALMS = buildPalms();

export const UMBRELLAS = (() => {
  const rng = mulberry32(31337);
  const list = [];
  for (let i = 0; i < 26; i++) {
    list.push({
      x: 140 + rng() * (WORLD_W - 280),
      y: BEACH_Y + 110 + rng() * (WORLD_H - BEACH_Y - 150),
      color: pick(rng, ['#ff7a59', '#2ec4b6', '#ffc93c', '#ff5d8f', '#4ea8ff']),
    });
  }
  return list;
})();

// --- Helpers ---------------------------------------------------------------

export function isOnRoad(x, y) {
  if (AVENUES.some((ax) => Math.abs(x - ax) <= HALF)) return true;
  if (STREETS.some((sy) => Math.abs(y - sy) <= HALF)) return true;
  return false;
}

export function isOnBeach(x, y) {
  return y >= BEACH_Y;
}

export function isInPark(x, y) {
  return x >= PARK.x && x <= PARK.x + PARK.w && y >= PARK.y && y <= PARK.y + PARK.h;
}

// Push a circle out of every building it overlaps; returns corrected x, y.
export function collideBuildings(x, y, r) {
  for (const b of BUILDINGS) {
    const nx = Math.max(b.x, Math.min(x, b.x + b.w));
    const ny = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - nx;
    const dy = y - ny;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        x = nx + (dx / d) * r;
        y = ny + (dy / d) * r;
      } else {
        // Centre inside the building: push out along the smallest axis.
        const left = x - b.x;
        const right = b.x + b.w - x;
        const top = y - b.y;
        const bottom = b.y + b.h - y;
        const m = Math.min(left, right, top, bottom);
        if (m === left) x = b.x - r;
        else if (m === right) x = b.x + b.w + r;
        else if (m === top) y = b.y - r;
        else y = b.y + b.h + r;
      }
    }
  }
  return { x, y };
}

export function buildingAt(x, y) {
  for (const b of BUILDINGS) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return null;
}

// A random point on a random road, with a lane offset for the given heading.
export function randomRoadPoint(rng) {
  if (rng() < 0.55) {
    const ax = pick(rng, AVENUES);
    return { x: ax, y: 80 + rng() * (WORLD_H - 160), vertical: true };
  }
  const sy = pick(rng, STREETS);
  return { x: 80 + rng() * (WORLD_W - 160), y: sy, vertical: false };
}

// A random pavement point: block edges, the park paths or the promenade.
export function randomSidewalkPoint(rng) {
  const choice = rng();
  if (choice < 0.2) {
    return { x: PARK.x + 30 + rng() * (PARK.w - 60), y: PARK.y + 30 + rng() * (PARK.h - 60) };
  }
  if (choice < 0.35) {
    return { x: 60 + rng() * (WORLD_W - 120), y: BEACH_Y + 24 + rng() * 30 };
  }
  const [cx0, cx1] = pick(rng, BLOCK_COLS);
  const [ry0, ry1] = pick(rng, BLOCK_ROWS);
  const side = Math.floor(rng() * 4);
  const along = rng();
  if (side === 0) return { x: cx0 + along * (cx1 - cx0), y: ry0 + 14 };
  if (side === 1) return { x: cx0 + along * (cx1 - cx0), y: ry1 - 14 };
  if (side === 2) return { x: cx0 + 14, y: ry0 + along * (ry1 - ry0) };
  return { x: cx1 - 14, y: ry0 + along * (ry1 - ry0) };
}
