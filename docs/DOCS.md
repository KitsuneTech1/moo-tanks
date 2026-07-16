# Technical Reference

## Architecture

Moo Tanks is a single-page browser game built with TypeScript and Vite. The simulation layer is deliberately separated from the DOM so it can run headless in tests.

Key files:

- `src/main.ts` ,  entry point, mounts the canvas and HUD, instantiates `TankArena`
- `src/tankArena.ts` ,  orchestrates the game loop, input, rendering, and UI bindings
- `src/simulation/localSimulation.ts` ,  the core simulation: tanks, shapes, bullets, bots, scoring, and mode logic
- `src/simulation/headlessHarness.ts` ,  headless harness used by `scripts/sim-smoke.mjs`
- `src/simulation/protocol.ts` ,  shared types and constants for the simulation
- `src/simulation/rules.ts` ,  stat formulas, XP curves, and damage calculations
- `src/simulation/talents.ts` ,  talent tree definitions and unlock logic
- `src/simulation/modes.ts` ,  game mode rules (FFA, TDM, Domination, Survival, Maze, Private Lobby)
- `src/style.css` ,  all styling for the HUD, menus, and upgrade panels
- `backend/spacetimedb/src/lib.rs` ,  SpacetimeDB module with schema and reducer stubs for future multiplayer
- `scripts/smoke.mjs` ,  browser smoke test that opens a headless Chromium instance
- `scripts/sim-smoke.mjs` ,  headless simulation smoke test that runs the simulation core directly in Node

## API / CLI / MCP Tools

There is no HTTP API or MCP server. The project exposes a few npm scripts:

- `npm run dev` ,  starts the Vite dev server (default `http://localhost:5173`)
- `npm run build` ,  runs `tsc` then `vite build`, outputs static files to `docs/`
- `npm run typecheck` ,  runs `tsc --noEmit`
- `npm run smoke` ,  runs `scripts/smoke.mjs`, which expects a running dev or preview server
- `npm run sim:smoke` ,  runs `scripts/sim-smoke.mjs`, a headless simulation test with no browser
- `npm run backend:check` ,  runs `cargo check` on the SpacetimeDB backend scaffold

## Configuration

### Client

No environment variables. The game reads high scores from `localStorage` and uses no external configuration.

### SpacetimeDB backend

The backend scaffold (`backend/spacetimedb`) expects a `.env` file at the project root or inside `backend/spacetimedb/`. The exact keys are defined in `backend/spacetimedb/src/lib.rs`. Refer to that file for the current expected variables.

## Data Model / Storage

### Client

- High scores are persisted in the browser's `localStorage`.
- All other state (player stats, bot state, shapes, bullets) lives in memory during a session and is discarded on page close or restart.

### SpacetimeDB backend (scaffold)

- Schema and reducer stubs are defined in `backend/spacetimedb/src/lib.rs`.
- No live database or server exists yet; this is preparation for a future multiplayer prototype.

## Deploy

The project deploys a static site to GitHub Pages from the `docs/` directory.

1. Run `npm run build` to regenerate `docs/`.
2. Push to the `main` branch. GitHub Pages serves the contents of `docs/` at `https://kitsunetech1.github.io/moo-tanks/`.

No server-side runtime is required for the current client-only build.

## Gotchas

- The game is a prototype. Performance can degrade with many bots or shapes, especially on lower-powered machines.
- The SpacetimeDB backend is a scaffold only. Running `cargo check` verifies it compiles, but there is no live server, no client prediction, and no snapshot interpolation yet.
- The browser smoke test (`npm run smoke`) requires a running dev or preview server. It will fail if no server is listening on the expected port.
- The headless simulation smoke test (`npm run sim:smoke`) runs the simulation core directly in Node. It does not exercise any rendering or DOM code.
- If port 5173 is in use, Vite automatically picks the next available port and prints the new URL. Check the terminal output.