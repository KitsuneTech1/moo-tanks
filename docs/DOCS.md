# Moo Tanks Technical Reference

## Architecture

The project has two main parts: a browser client and a SpacetimeDB backend scaffold.

### Browser client

- **Entry point:** `src/main.ts` mounts the game shell into `index.html` and instantiates `TankArena`.
- **Game loop:** `src/tankArena.ts` owns the canvas, HUD, menus, and the requestAnimationFrame loop. It delegates simulation to the core.
- **Simulation core:** `src/simulation/` contains the DOM-free game logic.
  - `localSimulation.ts` - the main simulation loop, entity management, and bot AI.
  - `rules.ts` - game rules: damage, XP, leveling, respawn.
  - `talents.ts` - talent tree definitions and upgrade paths.
  - `modes.ts` - game mode logic (FFA, TDM, Domination, Survival, Maze, Private Lobby).
  - `protocol.ts` - shared types and constants.
  - `headlessHarness.ts` - harness for running the simulation without a browser (used by `sim:smoke`).
- **Styling:** `src/style.css` handles all visual presentation.
- **Build tooling:** Vite (`vite.config.ts`) with TypeScript (`tsconfig.json`).

### SpacetimeDB backend scaffold

- **Location:** `backend/spacetimedb/`
- **Language:** Rust
- **Key file:** `src/lib.rs` contains the schema and reducer stubs.
- **Build check:** `npm run backend:check` runs `cargo check`.
- This scaffold is not connected to the client yet. It exists for future multiplayer work.

## CLI and Scripts

All commands are run via `npm run`.

| Command | What it does |
| --- | --- |
| `dev` | Starts the Vite dev server with hot reload. |
| `build` | Runs `tsc` then `vite build` to produce a static site in `dist/`. |
| `typecheck` | Runs `tsc` for type checking only, no emit. |
| `preview` | Serves the production build locally for testing. |
| `smoke` | Runs `scripts/smoke.mjs`, a browser-based smoke test. Requires a running dev or preview server. |
| `sim:smoke` | Runs `scripts/sim-smoke.mjs`, a headless simulation smoke test using the simulation core directly. |
| `backend:check` | Runs `cargo check` on the SpacetimeDB backend scaffold. |

## Configuration

The browser client has no environment variables or configuration files. All game parameters are hardcoded in `src/simulation/`.

The SpacetimeDB backend scaffold uses standard Rust/Cargo configuration. See `backend/spacetimedb/Cargo.toml` for dependencies.

## Data Model

### Client-side

There is no persistent storage. High scores are kept in `localStorage` for the duration of a browser session. The simulation state is held in memory and reset on page reload.

Key entities in the simulation core (`src/simulation/protocol.ts` and related files):

- **Tank:** position, velocity, angle, health, XP, level, score, upgrade points, talent tree state, team (for TDM).
- **Shape:** type (square, triangle, pentagon), position, health, XP value.
- **Bullet:** position, velocity, damage, owner reference.
- **Game mode state:** varies by mode (Domination zones, Survival wave counter, Maze walls, etc.).

### Backend scaffold

The SpacetimeDB schema is defined in `backend/spacetimedb/src/lib.rs`. It mirrors the client entities for future server-authoritative multiplayer.

## Deploy

The project includes a GitHub Pages workflow. Running `npm run build` produces a static site in `dist/`. The public demo is served from the `docs/` directory on the `main` branch.

To deploy manually:

```bash
npm run build
# Serve the dist/ directory with any static file server
npm run preview
```

## Gotchas

- **Bot Brawl is the quickest way to test.** The Deploy button starts a mode without bots unless you add them.
- **The simulation core is DOM-free.** Tests in `scripts/sim-smoke.mjs` use `headlessHarness.ts` and do not need a browser.
- **The smoke test needs a running server.** Run `npm run dev` or `npm run preview` in another terminal before running `npm run smoke`.
- **The SpacetimeDB backend does nothing yet.** It compiles but is not wired to the client. `npm run backend:check` only validates the Rust code.
- **Performance is not optimized.** Choppiness is expected with many entities or on lower-end machines. This is a prototype.
- **No mobile support.** The game expects a keyboard and mouse.