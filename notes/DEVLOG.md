# Devlog

## 2026-06-02

- Added `src/simulation/protocol.ts` with shared client input, server snapshot, tank, bullet, shape, event, and account summary types for the future backend/app work.
- Added `src/simulation/rules.ts` and `src/simulation/localSimulation.ts` so the active local game update loop can run without browser DOM.
- Updated `TankArena` to use `LocalTankSimulation` as the authoritative state source while keeping Canvas rendering, input translation, camera, menu, HUD, and debug/benchmark hooks in the browser layer.
- Added `src/simulation/headlessHarness.ts`, `scripts/sim-smoke.mjs`, and `npm run sim:smoke`.
- Added the disco `Made by Kitsune Technologies` footer on the web menu.
- Verified with `npm run typecheck`, `npm run sim:smoke`, `npm run build`, and `SMOKE_URL=http://127.0.0.1:5174 npm run smoke`. The raw benchmark reported 17225 FPS on the final smoke run.
- Added the M2 local mode foundation: FFA, TDM, Domination, Survival, Maze, Bot Brawl, and Private Lobby.
- Added team assignment/friendly-fire rules, Domination control points, and Survival wave spawning.
- Added class/talent state and behavior for Twin, Sniper, Machine Gun, Flank Guard, Drone, Trapper, and Destroyer.
- Added the web talent panel and menu mode picker.
- Expanded `npm run sim:smoke` to boot every local mode and verify Twin paired shots.
- Final post-M2 verification passed: `npm run typecheck`, `npm run sim:smoke`, `npm run build`, and `SMOKE_URL=http://127.0.0.1:5174 npm run smoke`; browser benchmark reported 7377 FPS after the backend scaffold work.
- Started M3 with `backend/spacetimedb`, a dedicated Rust SpacetimeDB module for database `moo-tanks`.
- Added backend tables for accounts, sessions, stats, inventory, loadouts, matches, queue entries, live players, inputs, and events.
- Added reducers for account mapping, queue/join, input intent, upgrades, talents, cosmetics, rewards, and dev cosmetic grants.
- Added `npm run backend:check`; `cargo check` passes for the backend module.

## 2026-06-01

- Created `moo-tanks` as a Vite + TypeScript browser game.
- Replaced the starter app with a full-screen Canvas 2D tank arena.
- Added player movement, aiming, firing, shape farming, leveling, upgrades, HUD, minimap, leaderboard, and high score persistence.
- Added 15 working bots with targeting, strafing, shooting, leveling, stat upgrades, and respawns.
- Added bot-only brawl mode for quick AI checks.
- Fixed bad WASD movement caused by speed clamping against world position instead of velocity.
- Added potato-mode performance work: DPR capped to 1, visible-only entity rendering, lighter HUD CSS, throttled HUD DOM updates, and less frequent body collision checks.
- Added smoke coverage for WASD movement and a raw-frame benchmark that fails below 200 FPS.

## Near-Term Notes

- Keep the project original: no copied Diep.io art, names, or assets.
- The current simulation is local-only and deterministic enough for iteration, but not ready for networked multiplayer.
- Multiplayer should probably split simulation into a shared core module before adding WebSocket transport.
