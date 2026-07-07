# Moo Tanks

A Diep-style browser tank arena prototype with working bots, upgrades, and shape farming.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

## [Play it](https://kitsunetech1.github.io/moo-tanks/)

Runs entirely in the browser, no account or install needed. Click Bot Brawl on the menu for an instant match against bots.

![Moo Tanks gameplay](docs-assets/screenshot.png)

## Features

- Player tank with mouse aim, movement, shooting, health, XP, score, and upgrade points.
- Shape farming: squares, triangles, and pentagons to grind for XP.
- Bots that roam, target shapes and other tanks, shoot, strafe, level up, and respawn.
- Leaderboard, minimap, health/XP bars, high score persistence, and pause/restart.
- Local modes: Free For All, Team Deathmatch, Domination, Survival, Maze Arena, Bot Brawl, and Private Lobby.
- Talent branches at level milestones: Twin, Sniper, Machine Gun, Flank Guard, Drone, Trapper, and Destroyer.
- A DOM-free simulation core (`src/simulation`) shared between the browser client and headless tests.
- A separate SpacetimeDB backend scaffold (`backend/spacetimedb`) for a future multiplayer prototype. Not required to play; the current build is fully client-side.

## Run locally

```bash
npm install
npm run dev
```

Build the static site:

```bash
npm run build
```

Other checks:

```bash
npm run typecheck   # tsc
npm run smoke       # browser smoke test (needs a running dev/preview server)
npm run sim:smoke   # headless simulation smoke test
npm run backend:check  # cargo check on the backend scaffold
```

## Controls

| Action | Input |
| --- | --- |
| Move | `WASD` or arrow keys |
| Aim | Mouse |
| Fire | Hold left mouse button |
| Toggle auto-fire | `E` |
| Upgrade a stat | Click an upgrade panel button, or number keys |
| Pick a talent | Click an unlocked talent button |
| Pause | `P` |
| Restart after death | `R` |

## Roadmap

This is a prototype, not a finished game. Current state and honest next steps:

- Done: playable single-player arena with bots, upgrades, talents, and local game modes.
- In progress: a dedicated SpacetimeDB backend for real multiplayer (schema and reducers exist, no live server yet).
- Planned: client prediction and snapshot interpolation once the backend is live, then account login, cosmetics, and a native Flutter client.

See `notes/ROADMAP.md` and `notes/DEVLOG.md` for details.

## License

MIT, see [LICENSE](LICENSE).

---

Built by [Kitsune Technologies](https://kitsunetechnologies.org). See more of our work at [kitsunetechnologies.org/work](https://kitsunetechnologies.org/work). Issues and PRs welcome.
