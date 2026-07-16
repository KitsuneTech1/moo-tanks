# Agent Guide

## Orientation

Moo Tanks is a single-page browser game written in TypeScript with Vite as the build tool. The simulation core (`src/simulation/`) is DOM-free and can run headless in Node for testing. The backend scaffold (`backend/spacetimedb/`) is Rust and compiles but has no live server.

## How to run and test

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
# Opens at http://localhost:5173 by default

# Type-check without emitting
npm run typecheck

# Build the static site (outputs to docs/)
npm run build

# Headless simulation smoke test (no browser needed)
npm run sim:smoke

# Browser smoke test (requires a running dev or preview server)
npm run smoke

# Check the SpacetimeDB backend compiles
npm run backend:check
```

## What an agent must know to work here safely

- Never commit a `.env` file. The backend scaffold reads secrets from `.env`; that file is in `.gitignore`.
- The `docs/` directory is the built output for GitHub Pages. Do not edit files there directly; run `npm run build` to regenerate it.
- The simulation core (`src/simulation/`) must stay DOM-free. Do not import browser APIs (like `document` or `window`) into those files.
- The headless harness (`src/simulation/headlessHarness.ts`) is the entry point for `scripts/sim-smoke.mjs`. If you change the simulation API, update the harness and the smoke test together.
- The browser smoke test (`scripts/smoke.mjs`) uses Puppeteer. It expects a running server. If you change the menu or canvas selectors, update the test.
- High scores are stored in `localStorage`. Do not introduce server-side persistence without updating the data model docs.
- The SpacetimeDB backend is a scaffold. Do not assume a live server exists. Any multiplayer work should start by reading `backend/spacetimedb/src/lib.rs` and `backend/README.md`.

## Common call shape

There is no HTTP API or MCP server. The game is a single class instantiated in `src/main.ts`:

```ts
const game = new TankArena({
  canvas: document.querySelector<HTMLCanvasElement>('#arena')!,
  menu: document.querySelector<HTMLElement>('#menu')!,
  menuTitle: document.querySelector<HTMLElement>('#menuTitle')!,
  menuStats: document.querySelector<HTMLElement>('#menuStats')!,
  modeGrid: document.querySelector<HTMLElement>('#modeGrid')!,
  startButton: document.querySelector<HTMLButtonElement>('#startButton')!,
  botButton: document.querySelector<HTMLButtonElement>('#botButton')!,
  playerName: document.querySelector<HTMLElement>('#playerName')!,
  playerLevel: document.querySelector<HTMLElement>('#playerLevel')!,
  healthFill: document.querySelector<HTMLElement>('#healthFill')!,
  xpFill: document.querySelector<HTMLElement>('#xpFill')!,
  scoreValue: document.querySelector<HTMLElement>('#scoreValue')!,
  bestValue: document.querySelector<HTMLElement>('#bestValue')!,
  leaderboardList: document.querySelector<HTMLOListElement>('#leaderboardList')!,
  upgradePanel: document.querySelector<HTMLElement>('#upgradePanel')!,
  talentPanel: document.querySelector<HTMLElement>('#talentPanel')!,
})

game.start()
```

The headless harness exposes a similar constructor in `src/simulation/headlessHarness.ts` for tests.