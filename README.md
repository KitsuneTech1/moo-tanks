# Moo Tanks

A browser tank arena prototype inspired by Diep.io, built with Vite, TypeScript, and Canvas 2D. It uses original visuals and local game logic rather than copied Diep.io assets.

## Current Build

- Player tank with mouse aim, movement, shooting, health, XP, score, and upgrade points.
- Shape farming with squares, triangles, and pentagons.
- Working bots that roam, target shapes and tanks, shoot, strafe, level up, upgrade stats, and respawn.
- Leaderboard, minimap, health/XP bars, high score persistence, pause/restart, and bot-only brawl mode.
- Default potato-mode rendering with capped canvas pixel ratio and throttled HUD updates.

## Controls

- Move: `WASD` or arrow keys
- Aim: mouse
- Fire: hold left mouse
- Toggle auto-fire: `E`
- Upgrade: click an upgrade or press number keys
- Pause: `P`
- Restart after death: `R`

## Run Locally

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

Smoke test:

```bash
npm run smoke
```

## Direction

The first version is intentionally a fast playable clone-type prototype. Good next steps are multiplayer, tank classes, more weapons, better bot personalities, team modes, and a content pipeline for original shapes/skins.
