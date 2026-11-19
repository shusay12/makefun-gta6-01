// Palmaris Heat — tuning constants and the city's colour palette.
// Every other module reads its numbers from here so the game can be
// rebalanced in one place.

export const WORLD_W = 3600;
export const WORLD_H = 2700;

export const ROAD_W = 120; // full width of a street, kerb to kerb
export const BEACH_Y = 2440; // sand starts here and runs to the south edge

export const PLAYER_RADIUS = 12;
export const PLAYER_WALK = 155;
export const PLAYER_SPRINT = 240;
export const PLAYER_HEALTH = 100;

export const MAX_WANTED = 5;
export const BUST_SECONDS_FOOT = 1.5; // stood still next to a cop this long = busted
export const BUST_SECONDS_CAR = 2.5;

export const SAVE_KEY = 'palmaris-heat-save-v1';

// Sun-soaked coastal palette: coral, sand, turquoise and sunset gold.
export const PALETTE = {
  water: '#1b6f8f',
  waterDeep: '#155a75',
  sand: '#ecd29a',
  sandDark: '#dec084',
  grass: '#79b657',
  grassDark: '#679c49',
  parkPath: '#d9c491',
  asphalt: '#4a4a52',
  asphaltDark: '#3f3f46',
  laneMark: '#f5eeda',
  kerb: '#cbbfa5',
  sidewalk: '#cfc4ab',
  plaza: '#e3d3a8',
  shadow: 'rgba(46, 32, 20, 0.28)',
  sunset: '#ffb35c',
  coral: '#ff7a59',
  gold: '#ffc93c',
  teal: '#2ec4b6',
  policeBlue: '#274690',
  policeLight: '#e63946',
  hudInk: '#17252b',
};

// Building roof colours, cycled by the city generator.
export const ROOF_COLORS = [
  '#e8e0cc', '#dfd3b8', '#e6c9a8', '#d9e2e4', '#eccfc0',
  '#f0e6d2', '#d8cfc0', '#e9d8b4', '#cfe0dd', '#f2ddc4',
];

// Respect titles earned as lifetime cash crosses each threshold.
export const RESPECT_TITLES = [
  [0, 'Nobody'],
  [400, 'Runner'],
  [1200, 'Wheelman'],
  [2600, 'Fixer'],
  [4500, 'Made Name'],
  [7000, 'Palmaris Legend'],
];

export function respectTitle(lifetimeCash) {
  let title = RESPECT_TITLES[0][1];
  for (const [need, name] of RESPECT_TITLES) {
    if (lifetimeCash >= need) title = name;
  }
  return title;
}
