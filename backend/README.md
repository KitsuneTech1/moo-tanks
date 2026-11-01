# Moo Tanks Backend

Dedicated backend scaffold for the Moo Tanks multiplayer roadmap.

## SpacetimeDB Module

Location:

```bash
backend/spacetimedb
```

Planned database name:

```text
moo-tanks
```

The module is intentionally separate from the Aethelgard `kitsune-backend` database.

## Tables

- `accounts`: SpacetimeDB identity, optional Firebase UID, display name, guest/link state, online status.
- `player_stats`: persistent kills, deaths, wins, losses, score, damage, and time played.
- `inventory`: cosmetic/DLC entitlement rows owned by an account.
- `loadouts`: selected skin, barrel effect, death burst, title, and talent preset.
- `matches`: mode, status, region, timestamps, and player count.
- `queue_entries`: one active queue row per identity.
- `live_players`: current match state owned by the server.
- `inputs`: latest movement/aim/fire intent per player.
- `events`: match event feed for kill feed, rewards, and results.

## Reducers

- `auth_session(firebase_uid, display_name)`
- `set_display_name(display_name)`
- `join_queue(mode)`
- `leave_queue()`
- `join_match(match_id)`
- `submit_input(move_x, move_y, aim_angle, fire, auto_fire)`
- `select_upgrade(stat)`
- `select_talent(talent_id)`
- `equip_cosmetic(slot, cosmetic_id)`
- `claim_match_rewards(match_id)`
- `grant_dev_cosmetic(item_type, item_id)` is disabled until a capability check exists.

Firebase ID token verification should happen in the Node bridge before calling `auth_session`; reducers only accept already-verified UID/display-name data.

## Local Verification

```bash
cd backend/spacetimedb
cargo check
```

## Deploy Sketch

`spacetime` is not currently on the Windows PATH. Publish from the SpacetimeDB host or install the CLI locally:

```bash
cd /opt/moo-tanks/backend/spacetimedb
spacetime publish --server http://127.0.0.1:3000 --yes moo-tanks
```

The public route for live clients should be a direct Caddy route, not Authentik-protected.
