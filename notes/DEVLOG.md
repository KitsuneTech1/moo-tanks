# Devlog

## 2026-06-01

- Created `moo-tanks` as a Vite + TypeScript browser game.
- Replaced the starter app with a full-screen Canvas 2D tank arena.
- Added player movement, aiming, firing, shape farming, leveling, upgrades, HUD, minimap, leaderboard, and high score persistence.
- Added 15 working bots with targeting, strafing, shooting, leveling, stat upgrades, and respawns.
- Added bot-only brawl mode for quick AI checks.

## Near-Term Notes

- Keep the project original: no copied Diep.io art, names, or assets.
- The current simulation is local-only and deterministic enough for iteration, but not ready for networked multiplayer.
- Multiplayer should probably split simulation into a shared core module before adding WebSocket transport.
