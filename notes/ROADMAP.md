# Roadmap

## M1: Core Refactor And Design Lock

- Status: active foundation landed.
- Keep the browser client as the fast playable web version.
- Split active local game truth into `src/simulation/LocalTankSimulation`.
- Keep `TankArena` focused on Canvas rendering, input translation, camera, HUD, menu state, and browser smoke hooks.
- Define shared protocol types in `src/simulation/protocol.ts`: `ClientInput`, `ServerSnapshot`, `TankState`, `BulletState`, `ShapeState`, `MatchEvent`, and `AccountSummary`.
- Add a DOM-free headless harness and `npm run sim:smoke`.
- Add menu footer branding: `Made by Kitsune Technologies` with cycling disco colors.

Acceptance:

- Current single-player web build still works.
- WASD movement and `benchmark(360)` smoke coverage stay green.
- Local simulation can run without DOM.

## M2: Game Systems Expansion

- Status: local foundation landed.
- Add mode foundation: Free For All, Team Deathmatch, Domination, Survival, Maze, Bot Brawl, and private/custom lobbies.
- Add talent tree branches such as Twin, Sniper, Machine Gun, Flank Guard, Drone, Trapper, and Destroyer.
- Add talent presets/loadouts.
- Teach bots simple archetypes so they can fill lobbies and exercise talents.

Current implementation:

- Menu mode picker launches FFA, TDM, Domination, Survival, Maze, and Private Lobby; Bot Brawl remains a direct shortcut.
- Team modes assign blue/red teams and block friendly fire.
- Domination spawns three local control points and publishes them in snapshots.
- Survival can spawn new enemy waves when the active enemy count drops.
- Talent state is included in `TankState`; selections publish `talentSelected` events.
- Talents currently change real behavior: paired Twin shots, Sniper projectile buffs, Machine Gun reload/spread, Flank rear barrel, Drone side pods, Trapper long-life rounds, and Destroyer cannon rounds.
- Bots spawn with simple archetype talents so local modes exercise class behavior immediately.

## M3: Dedicated SpacetimeDB Backend

- Status: dedicated module scaffold landed; authoritative match tick/deploy still pending.
- Create a dedicated Moo Tanks SpacetimeDB module/database, separate from Aethelgard.
- Use server-authoritative movement, bullets, collisions, kills, XP, score, respawns, match state, and rewards.
- Clients send input intent only.
- Add tables for accounts, player stats, inventory, loadouts, matches, players, inputs, and events.
- Deploy through a direct Caddy route, not Authentik-protected.

Current implementation:

- Added `backend/spacetimedb` as a separate Rust SpacetimeDB 2.3 module targeting database name `moo-tanks`.
- Added tables for accounts, sessions, player stats, inventory, loadouts, matches, queue entries, live players, inputs, and events.
- Added reducers for auth-session mapping, display name, queue/join, input submit, upgrade/talent select, cosmetic equip, reward claim, and dev cosmetic grants.
- Added `npm run backend:check`, verified with `cargo check`.
- Firebase token verification remains intentionally outside reducers and should live in a Node bridge before calling `auth_session`.

## M4: Web Multiplayer Client

- Render interpolated server snapshots.
- Add lightweight prediction for local movement/shooting feel.
- Add Google login, guest play, lobby/mode queue, account stats, cosmetics, DLC display, and talent presets.
- Show clear reconnect/return-to-menu states for network errors.

## M5: Native Flutter App

- Build a native Flutter client, not a WebView wrapper.
- Match the web palette, menus, HUD, upgrade/talent UI, leaderboard, minimap, and disco Kitsune footer.
- Use Firebase Auth for Google login.
- Prefer SpacetimeDB Dart SDK when stable enough; otherwise use the bridge protocol until it is reliable.
- Target Android first, then iOS.

## M6: Cosmetics, DLC, And Live Content

- Add persistent cosmetic inventory and equip flow.
- Store DLC entitlement records server-side.
- Gate only cosmetic/private/custom content, never combat power.
- Add manual admin/dev entitlement grants before any Stripe/payment integration.
