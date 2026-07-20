# Agent Guide for Moo Tanks

## Orientation

Moo Tanks is a browser-based tank arena game prototype. The simulation core (`src/simulation/`) is DOM-free and shared between the browser client and headless tests. The browser UI lives in `src/tankArena.ts` and `src/main.ts`. A SpacetimeDB backend scaffold exists at `backend/spacetimedb/` but is not connected to the client.

## How to Run and Test

### Start the dev server

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173/`. Vite picks the next free port if 5173 is busy.

### Type checking

```bash
npm run typecheck
```

Always run this before considering a change complete.

### Headless simulation test

```bash
npm run sim:smoke
```

This runs `scripts/sim-smoke.mjs`, which imports the simulation core directly. No browser needed. Use this for fast feedback on simulation changes.

### Browser smoke test

```bash
npm run dev    # in one terminal
npm run smoke  # in another terminal
```

`scripts/smoke.mjs` opens a headless browser and checks that the game loads without errors. Requires a running dev or preview server.

### Backend check

```bash
npm run backend:check
```

Runs `cargo check` on the SpacetimeDB scaffold. Only needed when touching files under `backend/spacetimedb/`.

### Build

```bash
npm run build
```

Produces a static site in `dist/`. The public demo is served from `docs/`.

## What an Agent Must Know

### The simulation core is the source of truth

All game logic lives in `src/simulation/`. The browser layer (`src/tankArena.ts`) is a thin renderer and input handler. When changing game behavior, start in the simulation files, not the UI.

### Keep the simulation DOM-free

`src/simulation/` must never import from `src/tankArena.ts`, `src/main.ts`, or any DOM API. The headless harness (`src/simulation/headlessHarness.ts`) depends on this separation. If you add a new simulation feature, make sure `npm run sim:smoke` still passes.

### The SpacetimeDB backend is a scaffold

It compiles but is not wired to anything. Do not spend effort integrating it unless explicitly asked. The `backend:check` script is only for validating that Rust code compiles.

### No environment variables

The client has no `.env` file or env var configuration. All tunables are constants in the simulation files. Do not introduce env var dependencies for the client.

### Testing pattern

- Simulation changes: run `npm run sim:smoke`.
- UI changes: run `npm run dev`, visually verify in browser, then run `npm run smoke`.
- Always run `npm run typecheck` before committing.

### Common call shape

There is no HTTP API or MCP server. The game runs entirely in the browser. The headless harness exposes the simulation as a plain TypeScript module:

```ts
import { HeadlessSimulation } from './src/simulation/headlessHarness'

const sim = new HeadlessSimulation({ mode: 'freeForAll', botCount: 4 })
sim.step() // advance one tick
const state = sim.getState() // read current state
```

For the browser, the game instance is attached to `window.__MOO_TANKS_GAME__` after startup. You can interact with it from the browser console for debugging.