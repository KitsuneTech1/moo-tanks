# Moo Tanks

A Diep-style browser tank arena prototype with bots, upgrades, and shape farming.

## Why

This is an early-stage prototype for exploring tank-arena mechanics, local game modes, and a future multiplayer backend. It runs entirely in the browser today so anyone can try it without an account or install.

## Features

- Player tank with mouse aim, WASD movement, shooting, health, XP, score, and upgrade points
- Shape farming: squares, triangles, and pentagons to grind for XP
- Bots that roam, target shapes and other tanks, shoot, strafe, level up, and respawn
- Leaderboard, minimap, health and XP bars, high score persistence, and pause/restart
- Local modes: Free For All, Team Deathmatch, Domination, Survival, Maze Arena, Bot Brawl, and Private Lobby
- Talent branches at level milestones: Twin, Sniper, Machine Gun, Flank Guard, Drone, Trapper, and Destroyer
- A DOM-free simulation core (`src/simulation`) shared between the browser client and headless tests
- A separate SpacetimeDB backend scaffold (`backend/spacetimedb`) for a future multiplayer prototype (not required to play)

## Quickstart

Play the live build at [kitsunetech1.github.io/moo-tanks](https://kitsunetech1.github.io/moo-tanks/).

To run locally:

```bash
git clone https://github.com/KitsuneTech1/moo-tanks.git
cd moo-tanks
npm install
npm run dev
```

Open `http://localhost:5173/` in your browser. Click **Bot Brawl** for an instant match against bots.

Other commands:

```bash
npm run build          # build the static site
npm run typecheck      # tsc
npm run smoke          # browser smoke test (needs a running dev/preview server)
npm run sim:smoke      # headless simulation smoke test
npm run backend:check  # cargo check on the backend scaffold
```

## Configuration

The client-side game has no environment variables. The SpacetimeDB backend scaffold (`backend/spacetimedb`) reads its configuration from a `.env` file (not included). Refer to `backend/spacetimedb/src/lib.rs` for the expected keys.

## License

MIT, see [LICENSE](LICENSE).