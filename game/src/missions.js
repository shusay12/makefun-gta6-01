// The story of Rio and the fixer Marisol Vega, told in five missions, plus
// endless paid errands once the story is done. A mission is a list of
// steps; each step knows its target, its label and when it is complete.

import { G, say, toast, addCash, commitCrime } from './state.js';
import { PLACES } from './city-map.js';
import { distance, mulberry32, pick } from './random.js';
import { makeCar } from './vehicles.js';
import { makePed } from './pedestrians.js';
import { playCash, playMissionDone, playPickup } from './audio.js';
import { saveGame } from './save-game.js';

const errandRng = mulberry32(60606);

export const STORY = [
  {
    title: 'First Wheels',
    start: PLACES.home,
    intro: 'Marisol: Rio. You owe me, so you drive for me. The blue coupe outside is "borrowed". Bring it to my Marina Garage.',
    reward: 250,
    steps: [
      { kind: 'steal-car', label: 'Steal the blue Vela Coupe', spawnType: 'coupe', spawnAt: { x: 272, y: 1210 }, color: '#2e86c1' },
      { kind: 'goto', label: 'Deliver the coupe to the Marina Garage', at: PLACES.garage, needCar: true },
    ],
    outro: 'Marisol: Clean work. The garage door is open to you now, Rio.',
  },
  {
    title: 'Harbor Run',
    start: PLACES.garage,
    intro: 'Marisol: A package waits at the Old Harbor warehouse. Pick it up, drop it at Coral Heights. No questions.',
    reward: 400,
    steps: [
      { kind: 'pickup', label: 'Pick up the package at the Old Harbor', at: PLACES.harbor },
      { kind: 'goto', label: 'Deliver the package to Coral Heights', at: PLACES.heights },
    ],
    outro: 'Marisol: The Heights pay well for discretion. So do I.',
  },
  {
    title: 'Heat Check',
    start: PLACES.garage,
    intro: 'Marisol: My client at the Avenida is scared and loud. Pick him up, lose the police, hide him in Palm Flats.',
    reward: 550,
    steps: [
      { kind: 'pickup-client', label: 'Pick up the client on the Avenida del Sol', at: PLACES.strip },
      { kind: 'escape', label: 'Lose the police!' },
      { kind: 'goto', label: 'Drop the client at the Palm Flats hideout', at: PLACES.hideout, needPassenger: true },
    ],
    outro: 'Marisol: He will tell the whole beach you are a ghost. Good for business.',
  },
  {
    title: 'The Long Fare',
    start: PLACES.garage,
    intro: 'Marisol: A singer at Palmaris Green must reach the North Gate before her boat leaves. Drive her yourself, fast.',
    reward: 700,
    steps: [
      { kind: 'pickup-client', label: 'Pick up the singer at Palmaris Green', at: PLACES.parkGate },
      { kind: 'timed-goto', label: 'Reach the North Gate before the boat leaves', at: PLACES.northGate, seconds: 150, needPassenger: true },
    ],
    outro: 'Marisol: She tipped in applause and cash. Mostly cash.',
  },
  {
    title: 'The Sunset Score',
    start: PLACES.garage,
    intro: 'Marisol: Last job. The gold Solana GT in my own showroom window — take it to the East Dock crane. Everyone will see. Everyone.',
    reward: 1500,
    steps: [
      { kind: 'steal-car', label: 'Steal the gold Solana GT from the showroom', spawnType: 'sport', spawnAt: { x: 1500, y: 1100 }, color: '#ffc93c' },
      { kind: 'goto', label: 'Deliver the GT to the East Dock crane', at: PLACES.dock, needCar: true },
    ],
    outro: 'Marisol: Debt paid in full, Rio. Palmaris is yours now — the errands board never sleeps.',
  },
];

export function storyDone() {
  return G.missionIndex >= STORY.length;
}

function currentStep() {
  if (!G.mission) return null;
  return G.mission.def.steps[G.mission.stepIndex];
}

export function startMission(index) {
  const def = STORY[index];
  G.mission = { def, stepIndex: 0, car: null, client: null, timer: 0 };
  say('Marisol Vega', def.intro, 7);
  enterStep();
}

function enterStep() {
  const m = G.mission;
  const step = currentStep();
  if (!step) return;
  if (step.kind === 'steal-car') {
    const rng = mulberry32(1000 + G.missionIndex * 77 + m.stepIndex);
    const car = makeCar(step.spawnAt.x, step.spawnAt.y, Math.PI, step.spawnType, 'mission', rng);
    car.color = step.color;
    G.cars.push(car);
    m.car = car;
  }
  if (step.kind === 'pickup-client') {
    const rng = mulberry32(2000 + G.missionIndex * 131 + m.stepIndex);
    const client = makePed(step.at.x + 18, step.at.y + 10, rng);
    client.state = 'client';
    G.peds.push(client);
    m.client = client;
  }
  if (step.kind === 'escape' && G.heat < 3) {
    commitCrime(3 - G.heat);
    say('Client', 'They are coming! Drive, drive!', 3);
  }
  if (step.kind === 'timed-goto') {
    m.timer = step.seconds;
  }
  if (step.kind === 'pickup') {
    // The harbor pickup is watched: heat arrives with the package.
  }
}

function completeStep() {
  const m = G.mission;
  const step = currentStep();
  if (step.kind === 'pickup') {
    playPickup();
    commitCrime(1);
    say('Marisol Vega', 'You have it. Someone just called the PPD — move!', 4);
  }
  if (step.kind === 'pickup-client') {
    playPickup();
    say('Client', 'Thank you — just get me there, please.', 3.4);
  }
  m.stepIndex++;
  if (m.stepIndex >= m.def.steps.length) {
    finishMission();
  } else {
    enterStep();
  }
}

function finishMission() {
  const m = G.mission;
  addCash(m.def.reward);
  playCash();
  playMissionDone();
  toast(`Mission complete: ${m.def.title}`, `+$${m.def.reward} — Marisol is pleased`);
  say('Marisol Vega', m.def.outro, 6);
  if (m.client && m.client.state === 'passenger') {
    dropClient(m.client);
  }
  G.mission = null;
  G.missionIndex++;
  saveGame();
  if (storyDone()) startErrand();
}

function dropClient(client) {
  const p = G.player;
  client.state = 'walk';
  client.x = p.x + 26;
  client.y = p.y + 10;
  client.tx = client.x + 60;
  client.ty = client.y;
  if (G.mission) G.mission.client = null;
}

// --- Errands: the endless board after the story ---------------------------

export function startErrand() {
  const spots = Object.values(PLACES).filter((s) => s.name !== 'Palmaris PD');
  const from = pick(errandRng, spots);
  let to = pick(errandRng, spots);
  if (to === from) to = PLACES.garage;
  const pay = Math.round(110 + distance(from.x, from.y, to.x, to.y) / 5);
  G.errand = { phase: 'pickup', x: from.x, y: from.y, toX: to.x, toY: to.y, pay, name: to.name };
}

function updateErrand() {
  const e = G.errand;
  if (!e) return;
  const p = G.player;
  if (e.phase === 'pickup' && distance(p.x, p.y, e.x, e.y) < 56) {
    e.phase = 'dropoff';
    playPickup();
    say('Dispatcher', `Package aboard. Take it to ${e.name}.`, 3.4);
  } else if (e.phase === 'dropoff' && distance(p.x, p.y, e.toX, e.toY) < 62) {
    addCash(e.pay);
    playCash();
    toast('Errand complete', `+$${e.pay}`);
    saveGame();
    startErrand();
  }
}

// --- Per-frame update -------------------------------------------------------

export function updateMissions(dt) {
  const p = G.player;

  // No active mission: offer the next one at its start marker.
  if (!G.mission && !storyDone()) {
    const def = STORY[G.missionIndex];
    if (distance(p.x, p.y, def.start.x, def.start.y) < 58) {
      startMission(G.missionIndex);
    }
    return;
  }
  if (!G.mission) {
    updateErrand();
    return;
  }

  const m = G.mission;
  const step = currentStep();
  if (!step) return;

  // A riding client sticks to the player's car.
  if (m.client && m.client.state === 'passenger' && p.car) {
    m.client.x = p.car.x;
    m.client.y = p.car.y;
  }

  switch (step.kind) {
    case 'steal-car':
      if (p.car && p.car === m.car) completeStep();
      break;
    case 'goto':
      if (step.needPassenger && !(m.client && m.client.state === 'passenger')) break;
      if (distance(p.x, p.y, step.at.x, step.at.y) < 62 && (!step.needCar || p.car)) {
        if (step.needPassenger) dropClient(m.client);
        completeStep();
      }
      break;
    case 'pickup':
      if (distance(p.x, p.y, step.at.x, step.at.y) < 48) completeStep();
      break;
    case 'pickup-client':
      if (p.car && m.client && distance(p.x, p.y, m.client.x, m.client.y) < 52) {
        m.client.state = 'passenger';
        completeStep();
      }
      break;
    case 'escape':
      if (G.wanted === 0) completeStep();
      break;
    case 'timed-goto':
      m.timer -= dt;
      if (m.timer <= 0) {
        m.timer = step.seconds;
        say('Marisol Vega', 'Too slow — the boat waits a little longer. Again, faster!', 4);
      }
      if (distance(p.x, p.y, step.at.x, step.at.y) < 62 && p.car) completeStep();
      break;
    default:
      break;
  }
}

// What the HUD, minimap and world marker should point at right now.
export function currentObjective() {
  const p = G.player;
  if (G.mission) {
    const step = currentStep();
    if (!step) return null;
    if (step.kind === 'steal-car' && G.mission.car) {
      return { x: G.mission.car.x, y: G.mission.car.y, text: step.label, title: G.mission.def.title };
    }
    if (step.kind === 'escape') {
      return { x: null, y: null, text: step.label, title: G.mission.def.title };
    }
    if (step.kind === 'pickup-client' && G.mission.client) {
      return { x: G.mission.client.x, y: G.mission.client.y, text: step.label, title: G.mission.def.title };
    }
    const at = step.at;
    if (at) {
      const extra = step.kind === 'timed-goto' ? ` — ${Math.max(0, Math.ceil(G.mission.timer))}s` : '';
      return { x: at.x, y: at.y, text: step.label + extra, title: G.mission.def.title };
    }
    return { text: step.label, title: G.mission.def.title, x: null, y: null };
  }
  if (storyDone()) {
    const e = G.errand;
    if (!e) return null;
    return e.phase === 'pickup'
      ? { x: e.x, y: e.y, text: 'Errand: pick up the package', title: 'Errand Board' }
      : { x: e.toX, y: e.toY, text: `Errand: deliver to ${e.name} (+$${e.pay})`, title: 'Errand Board' };
  }
  const def = STORY[G.missionIndex];
  return {
    x: def.start.x, y: def.start.y,
    text: `Meet Marisol's contact: ${def.title}`,
    title: 'Next Job',
    dist: Math.round(distance(p.x, p.y, def.start.x, def.start.y) / 4),
  };
}
