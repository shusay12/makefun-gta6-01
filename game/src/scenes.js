// Staged scenes for the screenshots: ?scene=cover|mission|chase|city sets
// up a genuine game state — real cars, real police, a real mission step —
// and freezes it, so each capture shows several systems at once exactly as
// the engine renders them in play. Nothing here draws anything itself.

import { G, say } from './state.js';
import { PLACES } from './city-map.js';
import { makeCar } from './vehicles.js';
import { mulberry32 } from './random.js';
import { addSkid, smokePuff } from './effects.js';
import { startMission } from './missions.js';

const sceneRng = mulberry32(2026);

function policeAt(x, y, angle, speed = 250) {
  const cop = makeCar(x, y, angle, 'police', 'police', sceneRng);
  cop.speed = speed;
  G.cars.push(cop);
  return cop;
}

function setWanted(stars) {
  G.heat = stars;
  G.wanted = stars;
  G.lastCrimeAt = G.time;
}

function camera(x, y, zoom = 1) {
  G.cam.x = x;
  G.cam.y = y;
  G.cam.zoom = zoom;
}

export function setupScene(name) {
  const p = G.player;
  G.mode = 'play';
  G.staging = name;

  if (name === 'cover') {
    // Mid-chase downtown: Rio in a red Solana GT, three interceptors on
    // him, the Harbor Run job live on the HUD.
    const car = makeCar(1560, 1487, 0, 'sport', 'player', sceneRng);
    car.color = '#e63946';
    car.speed = 265;
    G.cars.push(car);
    p.car = car;
    p.x = car.x;
    p.y = car.y;
    p.angle = 0;
    policeAt(1300, 1433, 0.12, 290);
    policeAt(1240, 1492, -0.06, 305);
    policeAt(1420, 1330, Math.PI / 2, 200);
    setWanted(3);
    G.cash = 640;
    G.lifetimeCash = 890;
    G.missionIndex = 1;
    startMission(1);
    for (let i = 0; i < 7; i++) {
      addSkid(1560 - i * 34, 1476 + Math.sin(i) * 3, 0);
      addSkid(1560 - i * 34, 1498 + Math.cos(i) * 3, 0);
    }
    camera(1620, 1460, 1);
  }

  if (name === 'mission') {
    // On foot at the Old Harbor, the package marker glowing ahead.
    p.x = 430;
    p.y = 345;
    p.angle = Math.atan2(PLACES.harbor.y - p.y, PLACES.harbor.x - p.x);
    p.car = null;
    G.cash = 375;
    G.lifetimeCash = 250;
    G.missionIndex = 1;
    startMission(1);
    camera(p.x, p.y, 1);
  }

  if (name === 'chase') {
    // Four stars on the northbound avenue, Rio's coupe smoking.
    const car = makeCar(2033, 1760, -Math.PI / 2, 'coupe', 'player', sceneRng);
    car.color = '#2e86c1';
    car.speed = 320;
    car.hp = 26;
    G.cars.push(car);
    p.car = car;
    p.x = car.x;
    p.y = car.y;
    p.angle = -Math.PI / 2;
    policeAt(2087, 2010, -Math.PI / 2, 330);
    policeAt(2033, 2150, -Math.PI / 2, 300);
    policeAt(1979, 1900, -Math.PI / 2, 285);
    policeAt(2087, 1470, Math.PI / 2, 160);
    G.missionIndex = 2;
    startMission(2);
    if (G.mission) G.mission.stepIndex = 1; // the escape step
    say('Client', 'They are coming! Drive, drive!', 9);
    setWanted(4);
    G.cash = 1225;
    G.lifetimeCash = 2100;
    for (let i = 0; i < 8; i++) {
      addSkid(2022, 1790 + i * 36, -Math.PI / 2);
      addSkid(2044, 1790 + i * 36, -Math.PI / 2);
    }
    for (let i = 0; i < 5; i++) smokePuff(car.x, car.y - 10, true);
    camera(2060, 1700, 1);
  }

  if (name === 'city') {
    // The wide postcard: Marina District, beach and sea, zoomed out.
    p.x = 2900;
    p.y = 2472;
    p.angle = Math.PI / 2;
    p.car = null;
    G.cash = 2840;
    G.lifetimeCash = 3400;
    G.missionIndex = 3;
    camera(2720, 2080, 0.5);
  }
}
