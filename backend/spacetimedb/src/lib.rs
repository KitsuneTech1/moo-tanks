use spacetimedb::{ConnectionId, Identity, ReducerContext, Table, Timestamp};

mod validation;
use validation::{claim_rewards_once, clamp_finite, dev_grants_enabled, finite, match_has_capacity};

const REGION: &str = "local";

#[spacetimedb::table(accessor = accounts, public)]
#[derive(Clone)]
pub struct Account {
    #[primary_key]
    identity: Identity,
    firebase_uid: String,
    display_name: String,
    guest: bool,
    created_at: Timestamp,
    last_seen_at: Timestamp,
    online: bool,
}

#[spacetimedb::table(accessor = sessions)]
pub struct Session {
    #[primary_key]
    connection_id: ConnectionId,
    identity: Identity,
    connected_at: Timestamp,
}

#[spacetimedb::table(accessor = player_stats, public)]
#[derive(Clone)]
pub struct PlayerStats {
    #[primary_key]
    identity: Identity,
    kills: u64,
    deaths: u64,
    wins: u64,
    losses: u64,
    score: u64,
    damage: u64,
    time_played_seconds: u64,
    updated_at: Timestamp,
}

#[spacetimedb::table(accessor = inventory, public)]
pub struct InventoryItem {
    #[primary_key]
    #[auto_inc]
    id: u64,
    #[index(btree)]
    identity: Identity,
    entitlement_id: String,
    item_type: String,
    item_id: String,
    granted_at: Timestamp,
}

#[spacetimedb::table(accessor = loadouts, public)]
#[derive(Clone)]
pub struct Loadout {
    #[primary_key]
    identity: Identity,
    skin_id: String,
    barrel_effect_id: String,
    death_burst_id: String,
    title_id: String,
    talent_preset: String,
    updated_at: Timestamp,
}

#[spacetimedb::table(accessor = matches, public)]
pub struct MatchRow {
    #[primary_key]
    #[auto_inc]
    id: u64,
    #[index(btree)]
    mode: String,
    status: String,
    region: String,
    started_at: Timestamp,
    ended_at: Timestamp,
    player_count: u32,
}

#[spacetimedb::table(accessor = queue_entries, public)]
pub struct QueueEntry {
    #[primary_key]
    identity: Identity,
    mode: String,
    queued_at: Timestamp,
}

#[spacetimedb::table(accessor = live_players, public)]
pub struct LivePlayer {
    #[primary_key]
    identity: Identity,
    #[index(btree)]
    match_id: u64,
    display_name: String,
    team: String,
    x: f32,
    y: f32,
    aim_angle: f32,
    health: f32,
    level: u32,
    xp: u64,
    score: u64,
    kills: u64,
    deaths: u64,
    rewards_claimed: bool,
    upgrade_csv: String,
    talent_csv: String,
    cosmetic_skin_id: String,
    connected: bool,
    updated_at: Timestamp,
}

#[spacetimedb::table(accessor = inputs, public)]
pub struct InputState {
    #[primary_key]
    identity: Identity,
    match_id: u64,
    move_x: f32,
    move_y: f32,
    aim_angle: f32,
    fire: bool,
    auto_fire: bool,
    updated_at: Timestamp,
}

#[spacetimedb::table(accessor = events, public)]
pub struct MatchEventRow {
    #[primary_key]
    #[auto_inc]
    id: u64,
    #[index(btree)]
    match_id: u64,
    event_type: String,
    actor: Identity,
    target: Identity,
    value: u64,
    body: String,
    created_at: Timestamp,
}

#[spacetimedb::reducer(init)]
pub fn init(_ctx: &ReducerContext) {
    log::info!("moo-tanks SpacetimeDB module initialized");
}

#[spacetimedb::reducer(client_connected)]
pub fn on_connect(ctx: &ReducerContext) -> Result<(), String> {
    let connection_id = ctx
        .connection_id()
        .ok_or_else(|| "client_connected reducer did not include a connection id".to_string())?;

    ctx.db.sessions().try_insert(Session {
        connection_id,
        identity: ctx.sender(),
        connected_at: ctx.timestamp,
    })?;

    upsert_account(ctx, None, None)?;
    Ok(())
}

#[spacetimedb::reducer(client_disconnected)]
pub fn on_disconnect(ctx: &ReducerContext) -> Result<(), String> {
    if let Some(connection_id) = ctx.connection_id() {
        ctx.db.sessions().connection_id().delete(&connection_id);
    }

    ctx.db.queue_entries().identity().delete(ctx.sender());

    if let Some(mut player) = ctx.db.live_players().identity().find(ctx.sender()) {
        player.connected = false;
        player.updated_at = ctx.timestamp;
        ctx.db.live_players().identity().update(player);
    }

    let still_connected = ctx
        .db
        .sessions()
        .iter()
        .any(|session| session.identity == ctx.sender());

    if !still_connected {
        if let Some(mut account) = ctx.db.accounts().identity().find(ctx.sender()) {
            account.online = false;
            account.last_seen_at = ctx.timestamp;
            ctx.db.accounts().identity().update(account);
        }
    }

    Ok(())
}

#[spacetimedb::reducer]
pub fn auth_session(ctx: &ReducerContext, firebase_uid: String, display_name: String) -> Result<(), String> {
    let uid = clean_text(firebase_uid, 128, "firebase uid")?;
    let name = clean_text(display_name, 32, "display name")?;
    upsert_account(ctx, Some(uid), Some(name))?;
    ensure_stats(ctx)?;
    ensure_loadout(ctx)?;
    Ok(())
}

#[spacetimedb::reducer]
pub fn set_display_name(ctx: &ReducerContext, display_name: String) -> Result<(), String> {
    let name = clean_text(display_name, 32, "display name")?;
    upsert_account(ctx, None, Some(name))?;
    Ok(())
}

#[spacetimedb::reducer]
pub fn join_queue(ctx: &ReducerContext, mode: String) -> Result<(), String> {
    let clean_mode = clean_mode(mode)?;
    upsert_account(ctx, None, None)?;
    ctx.db.queue_entries().identity().delete(ctx.sender());
    ctx.db.queue_entries().try_insert(QueueEntry {
        identity: ctx.sender(),
        mode: clean_mode.clone(),
        queued_at: ctx.timestamp,
    })?;

    let match_id = match_waiting_for_mode(ctx, &clean_mode)
        .map(|match_row| match_row.id)
        .unwrap_or_else(|| {
            ctx.db
                .matches()
                .insert(MatchRow {
                    id: 0,
                    mode: clean_mode.clone(),
                    status: "waiting".to_string(),
                    region: REGION.to_string(),
                    started_at: ctx.timestamp,
                    ended_at: ctx.timestamp,
                    player_count: 0,
                })
                .id
        });

    ctx.db.queue_entries().identity().delete(ctx.sender());
    join_match_inner(ctx, match_id)
}

#[spacetimedb::reducer]
pub fn leave_queue(ctx: &ReducerContext) {
    ctx.db.queue_entries().identity().delete(ctx.sender());
}

#[spacetimedb::reducer]
pub fn join_match(ctx: &ReducerContext, match_id: u64) -> Result<(), String> {
    upsert_account(ctx, None, None)?;
    join_match_inner(ctx, match_id)
}

#[spacetimedb::reducer]
pub fn submit_input(
    ctx: &ReducerContext,
    move_x: f32,
    move_y: f32,
    aim_angle: f32,
    fire: bool,
    auto_fire: bool,
) -> Result<(), String> {
    let player = ctx
        .db
        .live_players()
        .identity()
        .find(ctx.sender())
        .ok_or_else(|| "join a match before submitting input".to_string())?;

    let input = InputState {
        identity: ctx.sender(),
        match_id: player.match_id,
        move_x: clamp_finite(move_x, -1.0, 1.0, "move x")?,
        move_y: clamp_finite(move_y, -1.0, 1.0, "move y")?,
        aim_angle: finite(aim_angle, "aim angle")?,
        fire,
        auto_fire,
        updated_at: ctx.timestamp,
    };

    if ctx.db.inputs().identity().find(ctx.sender()).is_some() {
        ctx.db.inputs().identity().update(input);
    } else {
        ctx.db.inputs().try_insert(input)?;
    }

    Ok(())
}

#[spacetimedb::reducer]
pub fn select_upgrade(ctx: &ReducerContext, stat: String) -> Result<(), String> {
    let clean_stat = clean_upgrade(stat)?;
    let mut player = require_live_player(ctx)?;
    player.upgrade_csv = append_unique_csv(player.upgrade_csv, &clean_stat, 7)?;
    player.updated_at = ctx.timestamp;
    ctx.db.live_players().identity().update(player);
    Ok(())
}

#[spacetimedb::reducer]
pub fn select_talent(ctx: &ReducerContext, talent_id: String) -> Result<(), String> {
    let clean_talent = clean_talent(talent_id)?;
    let mut player = require_live_player(ctx)?;
    player.talent_csv = append_unique_csv(player.talent_csv, &clean_talent, 7)?;
    player.updated_at = ctx.timestamp;
    ctx.db.live_players().identity().update(player);
    Ok(())
}

#[spacetimedb::reducer]
pub fn equip_cosmetic(ctx: &ReducerContext, slot: String, cosmetic_id: String) -> Result<(), String> {
    let clean_slot = clean_slot(slot)?;
    let clean_cosmetic = clean_identifier(cosmetic_id, 64, "cosmetic id")?;
    ensure_loadout(ctx)?;

    if clean_cosmetic != "default" && !owns_item(ctx, &clean_cosmetic) {
        return Err("cosmetic is not owned by this account".to_string());
    }

    let mut loadout = ctx
        .db
        .loadouts()
        .identity()
        .find(ctx.sender())
        .ok_or_else(|| "loadout was not created".to_string())?;

    match clean_slot.as_str() {
        "skin" => loadout.skin_id = clean_cosmetic,
        "barrel" => loadout.barrel_effect_id = clean_cosmetic,
        "death_burst" => loadout.death_burst_id = clean_cosmetic,
        "title" => loadout.title_id = clean_cosmetic,
        _ => return Err("unknown cosmetic slot".to_string()),
    }

    loadout.updated_at = ctx.timestamp;
    ctx.db.loadouts().identity().update(loadout);
    Ok(())
}

#[spacetimedb::reducer]
pub fn claim_match_rewards(ctx: &ReducerContext, match_id: u64) -> Result<(), String> {
    let mut player = ctx
        .db
        .live_players()
        .identity()
        .find(ctx.sender())
        .ok_or_else(|| "no live player row to claim from".to_string())?;

    if player.match_id != match_id {
        return Err("player is not in that match".to_string());
    }
    claim_rewards_once(&mut player.rewards_claimed)?;

    let mut stats = ensure_stats(ctx)?;
    stats.kills += player.kills;
    stats.deaths += player.deaths;
    stats.score += player.score;
    stats.updated_at = ctx.timestamp;
    ctx.db.player_stats().identity().update(stats);
    player.updated_at = ctx.timestamp;
    ctx.db.live_players().identity().update(player);
    Ok(())
}

#[spacetimedb::reducer]
pub fn grant_dev_cosmetic(ctx: &ReducerContext, item_type: String, item_id: String) -> Result<(), String> {
    if !dev_grants_enabled() {
        return Err("development cosmetic grants are disabled".to_string());
    }
    let clean_type = clean_identifier(item_type, 32, "item type")?;
    let clean_item = clean_identifier(item_id, 64, "item id")?;
    ctx.db.inventory().insert(InventoryItem {
        id: 0,
        identity: ctx.sender(),
        entitlement_id: format!("dev:{clean_type}:{clean_item}"),
        item_type: clean_type,
        item_id: clean_item,
        granted_at: ctx.timestamp,
    });
    Ok(())
}

fn join_match_inner(ctx: &ReducerContext, match_id: u64) -> Result<(), String> {
    let mut match_row = ctx
        .db
        .matches()
        .id()
        .find(match_id)
        .ok_or_else(|| "match not found".to_string())?;

    if match_row.status == "ended" {
        return Err("match has already ended".to_string());
    }

    let already_in_match = ctx
        .db
        .live_players()
        .identity()
        .find(ctx.sender())
        .is_some_and(|player| player.match_id == match_id);
    let connected_players = ctx
        .db
        .live_players()
        .iter()
        .filter(|player| player.match_id == match_id && player.connected)
        .count() as u32;
    if !match_has_capacity(already_in_match, connected_players, max_players(&match_row.mode)) {
        return Err("match is full".to_string());
    }

    ctx.db.live_players().identity().delete(ctx.sender());
    let account = upsert_account(ctx, None, None)?;
    let loadout = ensure_loadout(ctx)?;
    let team = team_for_new_player(ctx, match_id, &match_row.mode);

    ctx.db.live_players().try_insert(LivePlayer {
        identity: ctx.sender(),
        match_id,
        display_name: account.display_name,
        team,
        x: 2100.0,
        y: 1500.0,
        aim_angle: 0.0,
        health: 100.0,
        level: 1,
        xp: 0,
        score: 0,
        kills: 0,
        deaths: 0,
        rewards_claimed: false,
        upgrade_csv: String::new(),
        talent_csv: loadout.talent_preset,
        cosmetic_skin_id: loadout.skin_id,
        connected: true,
        updated_at: ctx.timestamp,
    })?;

    match_row.player_count = ctx
        .db
        .live_players()
        .iter()
        .filter(|player| player.match_id == match_id && player.connected)
        .count() as u32;
    if match_row.player_count >= max_players(&match_row.mode) {
        match_row.status = "active".to_string();
    }
    ctx.db.matches().id().update(match_row);

    Ok(())
}

fn upsert_account(
    ctx: &ReducerContext,
    firebase_uid: Option<String>,
    display_name: Option<String>,
) -> Result<Account, String> {
    if let Some(mut account) = ctx.db.accounts().identity().find(ctx.sender()) {
        if let Some(uid) = firebase_uid {
            account.firebase_uid = uid;
            account.guest = false;
        }
        if let Some(name) = display_name {
            account.display_name = name;
        }
        account.online = true;
        account.last_seen_at = ctx.timestamp;
        ctx.db.accounts().identity().update(account.clone());
        return Ok(account);
    }

    let account = Account {
        identity: ctx.sender(),
        firebase_uid: firebase_uid.unwrap_or_default(),
        display_name: display_name.unwrap_or_else(|| "Guest".to_string()),
        guest: true,
        created_at: ctx.timestamp,
        last_seen_at: ctx.timestamp,
        online: true,
    };
    ctx.db.accounts().try_insert(account.clone())?;
    Ok(account)
}

fn ensure_stats(ctx: &ReducerContext) -> Result<PlayerStats, String> {
    if let Some(stats) = ctx.db.player_stats().identity().find(ctx.sender()) {
        return Ok(stats);
    }

    let stats = PlayerStats {
        identity: ctx.sender(),
        kills: 0,
        deaths: 0,
        wins: 0,
        losses: 0,
        score: 0,
        damage: 0,
        time_played_seconds: 0,
        updated_at: ctx.timestamp,
    };
    ctx.db.player_stats().try_insert(stats.clone())?;
    Ok(stats)
}

fn ensure_loadout(ctx: &ReducerContext) -> Result<Loadout, String> {
    if let Some(loadout) = ctx.db.loadouts().identity().find(ctx.sender()) {
        return Ok(loadout);
    }

    let loadout = Loadout {
        identity: ctx.sender(),
        skin_id: "default".to_string(),
        barrel_effect_id: "default".to_string(),
        death_burst_id: "default".to_string(),
        title_id: "default".to_string(),
        talent_preset: String::new(),
        updated_at: ctx.timestamp,
    };
    ctx.db.loadouts().try_insert(loadout.clone())?;
    Ok(loadout)
}

fn require_live_player(ctx: &ReducerContext) -> Result<LivePlayer, String> {
    ctx.db
        .live_players()
        .identity()
        .find(ctx.sender())
        .ok_or_else(|| "join a match before changing match state".to_string())
}

fn match_waiting_for_mode(ctx: &ReducerContext, mode: &str) -> Option<MatchRow> {
    ctx.db.matches().iter().find(|match_row| {
        match_row.mode == mode
            && match_row.status == "waiting"
            && match_row.player_count < max_players(mode)
    })
}

fn team_for_new_player(ctx: &ReducerContext, match_id: u64, mode: &str) -> String {
    if !uses_teams(mode) {
        return "neutral".to_string();
    }

    let mut blue = 0;
    let mut red = 0;
    for player in ctx.db.live_players().iter().filter(|player| player.match_id == match_id) {
        if player.team == "blue" {
            blue += 1;
        } else if player.team == "red" {
            red += 1;
        }
    }

    if blue <= red {
        "blue".to_string()
    } else {
        "red".to_string()
    }
}

fn owns_item(ctx: &ReducerContext, item_id: &str) -> bool {
    ctx.db
        .inventory()
        .iter()
        .any(|item| item.identity == ctx.sender() && item.item_id == item_id)
}

fn uses_teams(mode: &str) -> bool {
    mode == "teamDeathmatch" || mode == "domination" || mode == "survival"
}

fn max_players(mode: &str) -> u32 {
    match mode {
        "privateLobby" => 8,
        "survival" => 12,
        "botBrawl" => 16,
        _ => 24,
    }
}

fn append_unique_csv(current: String, value: &str, max_items: usize) -> Result<String, String> {
    let mut items = split_csv(&current);
    if items.iter().any(|item| item == value) {
        return Ok(current);
    }
    if items.len() >= max_items {
        return Err(format!("cannot select more than {max_items} items"));
    }
    items.push(value.to_string());
    Ok(items.join(","))
}

fn split_csv(value: &str) -> Vec<String> {
    value
        .split(',')
        .filter(|item| !item.is_empty())
        .map(|item| item.to_string())
        .collect()
}

fn clean_mode(value: String) -> Result<String, String> {
    let cleaned = clean_identifier(value, 32, "mode")?;
    match cleaned.as_str() {
        "freeForAll" | "teamDeathmatch" | "domination" | "survival" | "maze" | "botBrawl"
        | "privateLobby" => Ok(cleaned),
        _ => Err("unknown mode".to_string()),
    }
}

fn clean_upgrade(value: String) -> Result<String, String> {
    let cleaned = clean_identifier(value, 32, "upgrade")?;
    match cleaned.as_str() {
        "maxHealth" | "regen" | "bodyDamage" | "bulletSpeed" | "bulletDamage" | "reload"
        | "moveSpeed" => Ok(cleaned),
        _ => Err("unknown upgrade".to_string()),
    }
}

fn clean_talent(value: String) -> Result<String, String> {
    let cleaned = clean_identifier(value, 32, "talent")?;
    match cleaned.as_str() {
        "twin" | "sniper" | "machineGun" | "flankGuard" | "drone" | "trapper" | "destroyer" => {
            Ok(cleaned)
        }
        _ => Err("unknown talent".to_string()),
    }
}

fn clean_slot(value: String) -> Result<String, String> {
    let cleaned = clean_identifier(value, 32, "slot")?;
    match cleaned.as_str() {
        "skin" | "barrel" | "death_burst" | "title" => Ok(cleaned),
        _ => Err("unknown cosmetic slot".to_string()),
    }
}

fn clean_identifier(value: String, max_len: usize, label: &str) -> Result<String, String> {
    let cleaned = clean_text(value, max_len, label)?;
    let valid = cleaned
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' || ch == ':');

    if !valid {
        return Err(format!(
            "{label} may only contain ASCII letters, numbers, dashes, underscores, and colons"
        ));
    }

    Ok(cleaned)
}

fn clean_text(value: String, max_len: usize, label: &str) -> Result<String, String> {
    let cleaned = value.trim().to_string();

    if cleaned.is_empty() {
        return Err(format!("{label} cannot be empty"));
    }

    if cleaned.chars().count() > max_len {
        return Err(format!("{label} must be {max_len} characters or fewer"));
    }

    Ok(cleaned)
}
