# makefun-gta6-01

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/shusay12/makefun-gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/shusay12/makefun-gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

<sub>Entered on [make.fun](https://make.fun/?ref=susay21&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>

---

# Palmaris Heat — an original open-world crime game

A top-down open-world action game that runs entirely in the browser, written in vanilla JavaScript and canvas with a hand-rolled engine — no libraries, no assets, no network. Welcome to **Palmaris**, a sun-soaked coastal city of six avenues and four streets, some forty buildings with named landmarks (Hotel Solana, Palmaris PD, the Harbor Warehouse), a park, and a beach shore.

## What's in the city

- **On foot and behind the wheel** — walk the streets, steal any car, and drive it; traffic cars follow lanes and intersections, pedestrians stroll the sidewalks.
- **Wanted system** — commit crimes and your heat rises in fractional stars; up to six police interceptors hunt you, set up intercepts, and bust or waste you if they pin you down.
- **Gunplay** — mouse-aimed shooting, destructible cars, and escalating police response.
- **A five-mission story** for the fixer Marisol Vega — pickups, escapes, a timed fare — and an endless errand board once the story is done.
- **Full HUD** — live minimap, wanted stars, mission objective banner, cash and health.
- **Start screen and saves** — New Game / Continue, with progress kept in localStorage.
- **Synthesized audio** — music loop, engine, sirens and effects, all generated with WebAudio; no audio files.

## Running it

Open `game/index.html` in a desktop browser — fully offline. `main.ts` is the make.fun hand-in entry point: it copies `game/` and `screenshots/` to the output and writes the dossier via the kit's vendor module.

## Structure

The game source lives in `game/src/` as twenty small single-purpose files, each named for its job — city map, traffic, police, missions, minimap, save game, audio, and the rest.

## License

MIT — see `LICENSE`.
