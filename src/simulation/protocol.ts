export type Point = {
  x: number
  y: number
}

export type StatKey =
  | 'maxHealth'
  | 'regen'
  | 'bodyDamage'
  | 'bulletSpeed'
  | 'bulletDamage'
  | 'reload'
  | 'moveSpeed'

export type ShapeKind = 'square' | 'triangle' | 'pentagon'

export type TeamId = 'blue' | 'red' | 'neutral'

export type TalentBranch = 'Twin' | 'Sniper' | 'Machine Gun' | 'Flank Guard' | 'Drone' | 'Trapper' | 'Destroyer'

export type TalentId =
  | 'twin'
  | 'sniper'
  | 'machineGun'
  | 'flankGuard'
  | 'drone'
  | 'trapper'
  | 'destroyer'

export type MatchMode =
  | 'freeForAll'
  | 'teamDeathmatch'
  | 'domination'
  | 'survival'
  | 'maze'
  | 'botBrawl'
  | 'privateLobby'

export type TargetRef =
  | { type: 'shape'; id: number }
  | { type: 'tank'; id: number }

export type StatBlock = Record<StatKey, number>

export type ClientInput = {
  movement: Point
  aimAngle: number
  fire: boolean
  autoFire: boolean
  selectedUpgrade?: StatKey
  selectedTalent?: TalentId
}

export type TankState = {
  id: number
  name: string
  bot: boolean
  color: string
  accent: string
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  angle: number
  aimAngle: number
  health: number
  maxHealth: number
  lastHitAt: number
  level: number
  xp: number
  score: number
  team: TeamId
  upgradePoints: number
  talentPoints: number
  talents: TalentId[]
  classBranch?: TalentBranch
  stats: StatBlock
  cooldown: number
  alive: boolean
  respawnTimer: number
  ai?: {
    target?: TargetRef
    retargetIn: number
    strafe: number
    wanderAngle: number
    fire: boolean
  }
}

export type ControlPointState = {
  id: number
  label: string
  x: number
  y: number
  radius: number
  owner: TeamId
  progress: number
}

export type BulletState = {
  id: number
  ownerId: number
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  damage: number
  life: number
  color: string
}

export type ShapeState = {
  id: number
  kind: ShapeKind
  x: number
  y: number
  radius: number
  sides: number
  angle: number
  spin: number
  health: number
  maxHealth: number
  xp: number
  score: number
  color: string
  stroke: string
}

export type MatchEvent =
  | {
      type: 'shapeDestroyed'
      shapeId: number
      ownerId?: number
      xp: number
      score: number
    }
  | {
      type: 'tankDestroyed'
      victimId: number
      killerId?: number
      scoreAwarded: number
    }
  | {
      type: 'levelUp'
      tankId: number
      level: number
      upgradePoints: number
      talentPoints: number
    }
  | {
      type: 'talentSelected'
      tankId: number
      talentId: TalentId
      classBranch: TalentBranch
    }
  | {
      type: 'playerDestroyed'
      playerId: number
      score: number
    }

export type ServerSnapshot = {
  tick: number
  mode: MatchMode
  world: {
    width: number
    height: number
    grid: number
  }
  match: {
    label: string
    wave: number
    teamScores: Record<TeamId, number>
  }
  playerId: number
  tanks: TankState[]
  bullets: BulletState[]
  shapes: ShapeState[]
  controlPoints: ControlPointState[]
  events: MatchEvent[]
}

export type AccountSummary = {
  accountId: string
  firebaseUid?: string
  displayName: string
  guest: boolean
  stats: {
    kills: number
    deaths: number
    wins: number
    losses: number
    score: number
    damage: number
    timePlayedSeconds: number
  }
  loadout: {
    skinId?: string
    barrelEffectId?: string
    deathBurstId?: string
    titleId?: string
    talentPresetId?: string
  }
}
