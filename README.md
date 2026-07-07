# Moo Tanks

A browser tank arena prototype inspired by Diep.io, built with Vite, TypeScript, and Canvas 2D. It uses original visuals and local game logic rather than copied Diep.io assets.

## Current Build

- Player tank with mouse aim, movement, shooting, health, XP, score, and upgrade points.
- Shape farming with squares, triangles, and pentagons.
- Working bots that roam, target shapes and tanks, shoot, strafe, level up, upgrade stats, and respawn.
- Leaderboard, minimap, health/XP bars, high score persistence, pause/restart, and bot-only brawl mode.
- Default potato-mode rendering with capped canvas pixel ratio and throttled HUD updates.
- DOM-free local simulation module with shared protocol/snapshot types for the future multiplayer backend and native app.
- Local mode foundation for Free For All, Team Deathmatch, Domination, Survival, Maze Arena, Bot Brawl, and Private Lobby.
- Class/talent foundation with Twin, Sniper, Machine Gun, Flank Guard, Drone, Trapper, and Destroyer branches.
- Dedicated Moo Tanks SpacetimeDB backend scaffold under `backend/spacetimedb`.
- Menu footer branding: `Made by Kitsune Technologies` with cycling disco colors.

## Controls

- Move: `WASD` or arrow keys
- Aim: mouse
- Fire: hold left mouse
- Toggle auto-fire: `E`
- Upgrade: click an upgrade or press number keys
- Talent: click an unlocked talent button
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

Headless simulation smoke:

```bash
npm run sim:smoke
```

Backend check:

```bash
npm run backend:check
```

## Direction

The first version remains the fast playable web client. The expansion path is dedicated Moo Tanks SpacetimeDB multiplayer, Firebase Google login, persistent accounts/stats/cosmetics, deeper talents/loadouts, and a native Flutter client that matches the web visual style without being a WebView wrapper.
