import type {
  BulletState,
  ClientInput,
  ControlPointState,
  MatchEvent,
  MatchMode,
  Point,
  ServerSnapshot,
  ShapeKind,
  ShapeState,
  StatKey,
  TalentId,
  TeamId,
  TankState,
  TargetRef,
} from './protocol'
import {
  BOT_NAMES,
  COLLISION_INTERVAL,
  SHAPE_CONFIG,
  WORLD,
  angleDelta,
  bodyDamage,
  bulletDamage,
  bulletSpeed,
  clamp,
  createStats,
  distance,
  distanceSq,
  length,
  lerpAngle,
  lighten,
  moveSpeed,
  normalize,
  pick,
  random,
  randomInt,
  regenRate,
  reloadTime,
  xpForNext,
} from './rules'
import { modeDefinition, modeFromLegacyWatchBots } from './modes'
import { canSelectTalent, findTalent, hasTalent } from './talents'

export type DebugState = {
  playerX: number
  playerY: number
  playerVelocity: number
  bullets: number
  shapes: number
  tanks: number
  score: number
  level: number
  talentPoints: number
  talents: number
}

type ShotPattern = {
  angleOffset: number
  lateralOffset: number
  spread: number
  damageMultiplier: number
  speedMultiplier?: number
  radiusBonus?: number
  lifeMultiplier?: number
}

const EMPTY_INPUT: ClientInput = {
  movement: { x: 0, y: 0 },
  aimAngle: 0,
  fire: false,
  autoFire: false,
}

const BOT_ARCHETYPES: TalentId[][] = [
  ['twin'],
  ['sniper'],
  ['machineGun'],
  ['flankGuard', 'twin'],
  ['drone'],
  ['trapper'],
  ['destroyer'],
]

export class LocalTankSimulation {
  tanks: TankState[] = []
  bullets: BulletState[] = []
  shapes: ShapeState[] = []
  controlPoints: ControlPointState[] = []
  player!: TankState
  watchBots = false
  gameOver = false
  tick = 0
  nextId = 1
  collisionTimer = 0
  mode: MatchMode = 'freeForAll'
  wave = 1
  teamScores: Record<TeamId, number> = { blue: 0, red: 0, neutral: 0 }
  private events: MatchEvent[] = []

  constructor(modeOrWatchBots: MatchMode | boolean = false) {
    this.reset(modeOrWatchBots)
  }

  reset(modeOrWatchBots: MatchMode | boolean) {
    this.mode = typeof modeOrWatchBots === 'boolean' ? modeFromLegacyWatchBots(modeOrWatchBots) : modeOrWatchBots
    const mode = modeDefinition(this.mode)
    this.watchBots = this.mode === 'botBrawl'
    this.gameOver = false
    this.tick = 0
    this.nextId = 1
    this.collisionTimer = 0
    this.wave = 1
    this.teamScores = { blue: 0, red: 0, neutral: 0 }
    this.events = []
    this.bullets = []
    this.shapes = []
    this.controlPoints = mode.controlPoints ? this.createControlPoints() : []
    this.tanks = []

    this.player = this.createTank(
      'Moo',
      !this.watchBots,
      WORLD.width / 2,
      WORLD.height / 2,
      '#45a3ff',
      mode.teams ? 'blue' : 'neutral',
    )
    if (this.watchBots) {
      this.player.bot = true
      this.player.name = 'Moo Bot'
      this.player.ai = this.createBrain()
    }
    this.tanks.push(this.player)

    for (let i = 0; i < mode.botCount; i += 1) {
      const spawn = this.findSpawnPoint(this.player, 760, 220)
      const team = this.botTeam(i)
      const bot = this.createTank(
        BOT_NAMES[i % BOT_NAMES.length],
        false,
        spawn.x,
        spawn.y,
        team === 'blue' ? pick(['#45a3ff', '#36d1dc', '#5fa8ff']) : pick(['#ff6b6b', '#ff9f43', '#b57dff']),
        team,
      )
      bot.bot = true
      bot.ai = this.createBrain()
      const targetLevel = randomInt(5, 12)
      for (let level = 1; level < targetLevel; level += 1) {
        this.levelUp(bot, true)
      }
      this.assignBotArchetype(bot, i)
      this.tanks.push(bot)
    }

    for (let i = 0; i < mode.shapeTarget; i += 1) {
      this.spawnShape()
    }
  }

  update(dt: number, time: number, input: ClientInput = EMPTY_INPUT) {
    if (this.gameOver) return
    if (input.selectedUpgrade) {
      this.upgradeStat(input.selectedUpgrade)
    }
    if (input.selectedTalent) {
      this.selectTalent(input.selectedTalent)
    }

    const mode = modeDefinition(this.mode)
    while (this.shapes.length < mode.shapeTarget) {
      this.spawnShape()
    }

    for (const shape of this.shapes) {
      shape.angle += shape.spin * dt
    }

    for (const tank of this.tanks) {
      if (!tank.alive) {
        this.updateRespawn(tank, dt)
        continue
      }

      this.applyStats(tank)
      tank.cooldown = Math.max(0, tank.cooldown - dt)
      this.regenerate(tank, dt, time)

      if (tank.bot) {
        this.updateBot(tank, dt)
      } else {
        this.updatePlayer(tank, dt, input)
      }

      this.moveTank(tank, dt)
      const shouldFire = tank.bot ? Boolean(tank.ai?.fire) : input.fire || input.autoFire
      if (shouldFire) {
        this.tryShoot(tank)
      }
    }

    this.updateBullets(dt, time)
    this.collisionTimer += dt
    if (this.collisionTimer >= COLLISION_INTERVAL) {
      this.resolveBodyCollisions(this.collisionTimer, time)
      this.collisionTimer = 0
    }
    if (mode.controlPoints) {
      this.updateControlPoints(dt)
    }
    if (mode.survival) {
      this.updateSurvivalWave()
    }
    this.tick += 1
  }

  createTank(name: string, human: boolean, x: number, y: number, color: string, team: TeamId): TankState {
    const tank: TankState = {
      id: this.nextId,
      name,
      bot: !human,
      color,
      accent: lighten(color, 0.22),
      x,
      y,
      vx: 0,
      vy: 0,
      radius: 28,
      angle: 0,
      aimAngle: 0,
      health: 100,
      maxHealth: 100,
      lastHitAt: 0,
      level: 1,
      xp: 0,
      score: 0,
      team,
      upgradePoints: 0,
      talentPoints: 0,
      talents: [],
      stats: createStats(),
      cooldown: 0,
      alive: true,
      respawnTimer: 0,
    }
    this.nextId += 1
    this.applyStats(tank)
    return tank
  }

  botTeam(index: number): TeamId {
    const mode = modeDefinition(this.mode)
    if (!mode.teams) return 'neutral'
    if (mode.survival) return 'red'
    return index % 2 === 0 ? 'red' : 'blue'
  }

  createControlPoints(): ControlPointState[] {
    return [
      { id: 1, label: 'A', x: WORLD.width * 0.28, y: WORLD.height * 0.32, radius: 150, owner: 'neutral', progress: 0 },
      { id: 2, label: 'B', x: WORLD.width * 0.5, y: WORLD.height * 0.5, radius: 165, owner: 'neutral', progress: 0 },
      { id: 3, label: 'C', x: WORLD.width * 0.72, y: WORLD.height * 0.68, radius: 150, owner: 'neutral', progress: 0 },
    ]
  }

  createBrain() {
    return {
      retargetIn: random(0.1, 0.8),
      strafe: pick([-1, 1]),
      wanderAngle: random(0, Math.PI * 2),
      fire: false,
    }
  }

  assignBotArchetype(tank: TankState, botIndex: number) {
    const archetype = BOT_ARCHETYPES[botIndex % BOT_ARCHETYPES.length]
    for (const talentId of archetype) {
      const talent = findTalent(talentId)
      if (talent && tank.level >= talent.minLevel) {
        this.grantTalent(tank, talentId, false)
      }
    }
  }

  updatePlayer(tank: TankState, dt: number, input: ClientInput) {
    const direction = normalize(input.movement)
    const speed = moveSpeed(tank)
    tank.vx += direction.x * speed * 9 * dt
    tank.vy += direction.y * speed * 9 * dt
    tank.aimAngle = input.aimAngle
    tank.angle = lerpAngle(tank.angle, tank.aimAngle, 0.24)
  }

  updateBot(tank: TankState, dt: number) {
    const brain = tank.ai
    if (!brain) return

    brain.retargetIn -= dt
    if (!brain.target || brain.retargetIn <= 0 || !this.targetExists(brain.target)) {
      brain.target = this.findTarget(tank)
      brain.retargetIn = random(0.35, 0.9)
      if (Math.random() < 0.22) {
        brain.strafe *= -1
      }
    }

    const target = brain.target ? this.getTargetPoint(brain.target) : undefined
    if (!target) {
      brain.fire = false
      brain.wanderAngle += random(-0.4, 0.4) * dt
      const wander = { x: Math.cos(brain.wanderAngle), y: Math.sin(brain.wanderAngle) }
      this.accelerate(tank, wander, 0.68, dt)
      tank.aimAngle = brain.wanderAngle
      tank.angle = lerpAngle(tank.angle, tank.aimAngle, 0.12)
      return
    }

    const toTarget = { x: target.x - tank.x, y: target.y - tank.y }
    const distanceToTarget = length(toTarget)
    const forward = normalize(toTarget)
    const side = { x: -forward.y * brain.strafe, y: forward.x * brain.strafe }
    const ideal = target.type === 'shape' ? 360 : 520
    const panic = tank.health / tank.maxHealth < 0.33 && target.type === 'tank'

    let movement = { x: side.x * 0.44, y: side.y * 0.44 }
    if (distanceToTarget > ideal + 80) {
      movement.x += forward.x
      movement.y += forward.y
    } else if (distanceToTarget < ideal - 120 || panic) {
      movement.x -= forward.x * 1.15
      movement.y -= forward.y * 1.15
    }

    if (tank.x < 240) movement.x += 1
    if (tank.x > WORLD.width - 240) movement.x -= 1
    if (tank.y < 240) movement.y += 1
    if (tank.y > WORLD.height - 240) movement.y -= 1

    this.accelerate(tank, normalize(movement), 0.82, dt)
    tank.aimAngle = Math.atan2(toTarget.y, toTarget.x)
    tank.angle = lerpAngle(tank.angle, tank.aimAngle, 0.14)
    brain.fire = distanceToTarget < 900 && Math.abs(angleDelta(tank.angle, tank.aimAngle)) < 0.42

    while (tank.upgradePoints > 0) {
      const priorities: StatKey[] =
        tank.level < 8
          ? ['bulletDamage', 'reload', 'moveSpeed', 'bulletSpeed']
          : ['bulletDamage', 'reload', 'maxHealth', 'regen', 'moveSpeed', 'bulletSpeed', 'bodyDamage']
      this.upgradeStatFor(tank, pick(priorities))
    }
  }

  accelerate(tank: TankState, direction: Point, multiplier: number, dt: number) {
    const speed = moveSpeed(tank)
    tank.vx += direction.x * speed * 7.5 * multiplier * dt
    tank.vy += direction.y * speed * 7.5 * multiplier * dt
  }

  moveTank(tank: TankState, dt: number) {
    tank.vx *= Math.pow(0.0018, dt)
    tank.vy *= Math.pow(0.0018, dt)
    const maxSpeed = moveSpeed(tank)
    const velocity = Math.hypot(tank.vx, tank.vy)
    if (velocity > maxSpeed) {
      tank.vx = (tank.vx / velocity) * maxSpeed
      tank.vy = (tank.vy / velocity) * maxSpeed
    }

    tank.x = clamp(tank.x + tank.vx * dt, tank.radius, WORLD.width - tank.radius)
    tank.y = clamp(tank.y + tank.vy * dt, tank.radius, WORLD.height - tank.radius)
  }

  tryShoot(tank: TankState) {
    if (!tank.alive || tank.cooldown > 0) return
    const patterns = this.shotPatterns(tank)
    for (const pattern of patterns) {
      this.spawnBullet(tank, pattern)
    }

    const recoil = tank.radius * 0.2
    const recoilMultiplier = hasTalent(tank, 'destroyer') ? 1.55 : hasTalent(tank, 'machineGun') ? 0.55 : 1
    tank.cooldown = reloadTime(tank)
    tank.vx -= Math.cos(tank.angle) * recoil * 5 * recoilMultiplier
    tank.vy -= Math.sin(tank.angle) * recoil * 5 * recoilMultiplier
  }

  shotPatterns(tank: TankState): ShotPattern[] {
    const spread = hasTalent(tank, 'machineGun') ? 0.085 : hasTalent(tank, 'destroyer') ? 0.012 : 0.025
    const patterns: ShotPattern[] = hasTalent(tank, 'twin')
      ? [
          { angleOffset: -0.045, lateralOffset: -12, spread, damageMultiplier: 1 },
          { angleOffset: 0.045, lateralOffset: 12, spread, damageMultiplier: 1 },
        ]
      : [{ angleOffset: 0, lateralOffset: 0, spread, damageMultiplier: 1 }]

    if (hasTalent(tank, 'flankGuard')) {
      patterns.push({
        angleOffset: Math.PI,
        lateralOffset: 0,
        spread: 0.018,
        damageMultiplier: 0.62,
        speedMultiplier: 0.78,
        radiusBonus: -1,
        lifeMultiplier: 0.85,
      })
    }

    if (hasTalent(tank, 'drone')) {
      patterns.push(
        {
          angleOffset: -0.72,
          lateralOffset: -18,
          spread: 0.04,
          damageMultiplier: 0.42,
          speedMultiplier: 0.58,
          radiusBonus: -2,
          lifeMultiplier: 1.65,
        },
        {
          angleOffset: 0.72,
          lateralOffset: 18,
          spread: 0.04,
          damageMultiplier: 0.42,
          speedMultiplier: 0.58,
          radiusBonus: -2,
          lifeMultiplier: 1.65,
        },
      )
    }

    return patterns
  }

  spawnBullet(tank: TankState, pattern: ShotPattern) {
    const speed = bulletSpeed(tank) * (pattern.speedMultiplier ?? 1)
    const barrelLength = tank.radius + 28
    const shotAngle = tank.angle + pattern.angleOffset
    const spread = random(-pattern.spread, pattern.spread)
    const angle = shotAngle + spread
    const side = { x: -Math.sin(tank.angle), y: Math.cos(tank.angle) }
    const muzzle = {
      x: tank.x + Math.cos(shotAngle) * barrelLength + side.x * pattern.lateralOffset,
      y: tank.y + Math.sin(shotAngle) * barrelLength + side.y * pattern.lateralOffset,
    }
    const radiusBonus =
      (pattern.radiusBonus ?? 0) + (hasTalent(tank, 'destroyer') ? 5 : 0) + (hasTalent(tank, 'trapper') ? 4 : 0)
    const lifeMultiplier =
      (pattern.lifeMultiplier ?? 1) *
      (hasTalent(tank, 'sniper') ? 1.25 : 1) *
      (hasTalent(tank, 'trapper') ? 2.25 : 1)
    this.bullets.push({
      id: this.nextId,
      ownerId: tank.id,
      x: muzzle.x,
      y: muzzle.y,
      vx: Math.cos(angle) * speed + tank.vx * 0.2,
      vy: Math.sin(angle) * speed + tank.vy * 0.2,
      radius: Math.max(4, 7 + tank.stats.bulletDamage * 0.25 + radiusBonus),
      damage: bulletDamage(tank) * pattern.damageMultiplier,
      life: (1.45 + tank.stats.bulletSpeed * 0.03) * lifeMultiplier,
      color: tank.accent,
    })
    this.nextId += 1
  }

  updateBullets(dt: number, time: number) {
    for (let i = this.bullets.length - 1; i >= 0; i -= 1) {
      const bullet = this.bullets[i]
      bullet.x += bullet.vx * dt
      bullet.y += bullet.vy * dt
      bullet.life -= dt

      let removed =
        bullet.life <= 0 ||
        bullet.x < -80 ||
        bullet.y < -80 ||
        bullet.x > WORLD.width + 80 ||
        bullet.y > WORLD.height + 80
      if (!removed) {
        removed = this.hitShapes(bullet, time)
      }
      if (!removed) {
        removed = this.hitTanks(bullet, time)
      }
      if (removed) {
        this.bullets.splice(i, 1)
      }
    }
  }

  hitShapes(bullet: BulletState, time: number) {
    for (let i = this.shapes.length - 1; i >= 0; i -= 1) {
      const shape = this.shapes[i]
      const hitRange = bullet.radius + shape.radius
      if (distanceSq(bullet, shape) > hitRange * hitRange) continue

      shape.health -= bullet.damage
      const owner = this.tanks.find((tank) => tank.id === bullet.ownerId)
      if (owner) {
        owner.score += Math.ceil(bullet.damage * 0.18)
      }
      if (shape.health <= 0) {
        this.shapes.splice(i, 1)
        this.events.push({
          type: 'shapeDestroyed',
          shapeId: shape.id,
          ownerId: owner?.id,
          xp: shape.xp,
          score: shape.score,
        })
        if (owner) {
          this.award(owner, shape.xp, shape.score)
        }
      }
      this.nudgeOwner(bullet, shape, time)
      return true
    }
    return false
  }

  hitTanks(bullet: BulletState, time: number) {
    for (const tank of this.tanks) {
      if (!tank.alive || tank.id === bullet.ownerId) continue
      const owner = this.tanks.find((candidate) => candidate.id === bullet.ownerId)
      if (owner && this.areAllies(owner, tank)) continue
      const hitRange = bullet.radius + tank.radius
      if (distanceSq(bullet, tank) > hitRange * hitRange) continue

      tank.health -= bullet.damage
      tank.lastHitAt = time
      tank.vx += bullet.vx * 0.022
      tank.vy += bullet.vy * 0.022
      if (tank.health <= 0) {
        this.killTank(tank, owner)
      }
      return true
    }
    return false
  }

  nudgeOwner(bullet: BulletState, shape: ShapeState, time: number) {
    const owner = this.tanks.find((tank) => tank.id === bullet.ownerId)
    if (!owner) return
    const away = normalize({ x: shape.x - owner.x, y: shape.y - owner.y })
    shape.x = clamp(shape.x + away.x * 3, shape.radius, WORLD.width - shape.radius)
    shape.y = clamp(shape.y + away.y * 3, shape.radius, WORLD.height - shape.radius)
    owner.lastHitAt = Math.max(owner.lastHitAt, time - 1500)
  }

  resolveBodyCollisions(dt: number, time: number) {
    for (const tank of this.tanks) {
      if (!tank.alive) continue

      for (const shape of this.shapes) {
        const range = tank.radius + shape.radius
        const distSq = distanceSq(tank, shape)
        if (distSq > range * range) continue
        const gap = range - Math.sqrt(distSq)
        if (gap <= 0) continue
        const away = normalize({ x: tank.x - shape.x, y: tank.y - shape.y })
        tank.x = clamp(tank.x + away.x * gap * 0.56, tank.radius, WORLD.width - tank.radius)
        tank.y = clamp(tank.y + away.y * gap * 0.56, tank.radius, WORLD.height - tank.radius)
        shape.x = clamp(shape.x - away.x * gap * 0.24, shape.radius, WORLD.width - shape.radius)
        shape.y = clamp(shape.y - away.y * gap * 0.24, shape.radius, WORLD.height - shape.radius)
        const damage = bodyDamage(tank) * dt
        shape.health -= damage
        tank.health -= Math.max(1, shape.radius * 0.035) * dt
        tank.lastHitAt = time
        if (shape.health <= 0) {
          this.shapes.splice(this.shapes.indexOf(shape), 1)
          this.events.push({
            type: 'shapeDestroyed',
            shapeId: shape.id,
            ownerId: tank.id,
            xp: shape.xp,
            score: shape.score,
          })
          this.award(tank, shape.xp, shape.score)
        }
        if (tank.health <= 0) {
          this.killTank(tank, undefined)
          break
        }
      }
    }

    for (let a = 0; a < this.tanks.length; a += 1) {
      const first = this.tanks[a]
      if (!first.alive) continue
      for (let b = a + 1; b < this.tanks.length; b += 1) {
        const second = this.tanks[b]
        if (!second.alive) continue
        const range = first.radius + second.radius
        const distSq = distanceSq(first, second)
        if (distSq > range * range) continue
        const gap = range - Math.sqrt(distSq)
        if (gap <= 0) continue
        const away = normalize({ x: first.x - second.x, y: first.y - second.y })
        first.x += away.x * gap * 0.5
        first.y += away.y * gap * 0.5
        second.x -= away.x * gap * 0.5
        second.y -= away.y * gap * 0.5
        if (!this.areAllies(first, second)) {
          first.health -= bodyDamage(second) * dt
          second.health -= bodyDamage(first) * dt
          first.lastHitAt = time
          second.lastHitAt = time
          if (first.health <= 0) this.killTank(first, second)
          if (second.health <= 0) this.killTank(second, first)
        }
      }
    }
  }

  updateControlPoints(dt: number) {
    for (const point of this.controlPoints) {
      let blue = 0
      let red = 0
      for (const tank of this.tanks) {
        if (!tank.alive || tank.team === 'neutral') continue
        const range = point.radius + tank.radius
        if (distanceSq(point, tank) > range * range) continue
        if (tank.team === 'blue') blue += 1
        if (tank.team === 'red') red += 1
      }

      if (blue !== red) {
        point.progress = clamp(point.progress + Math.sign(blue - red) * dt * 0.42, -1, 1)
      }
      if (point.progress >= 1) point.owner = 'blue'
      if (point.progress <= -1) point.owner = 'red'
      if (point.owner !== 'neutral') {
        this.teamScores[point.owner] += dt * 2
      }
    }
  }

  updateSurvivalWave() {
    const liveEnemies = this.tanks.filter((tank) => tank.alive && tank.team === 'red').length
    if (liveEnemies > 2) return
    this.wave += 1
    for (let i = 0; i < Math.min(4 + this.wave, 12); i += 1) {
      const spawn = this.findSpawnPoint(this.player, 720, 180)
      const bot = this.createTank(`Wave ${this.wave}-${i + 1}`, false, spawn.x, spawn.y, '#ff6b6b', 'red')
      bot.bot = true
      bot.ai = this.createBrain()
      for (let level = 1; level < Math.min(5 + this.wave, 18); level += 1) {
        this.levelUp(bot, true)
      }
      this.assignBotArchetype(bot, i + this.wave)
      this.tanks.push(bot)
    }
  }

  regenerate(tank: TankState, dt: number, time: number) {
    if (time - tank.lastHitAt < 2600) return
    tank.health = Math.min(tank.maxHealth, tank.health + regenRate(tank) * dt)
  }

  updateRespawn(tank: TankState, dt: number) {
    if (!tank.bot) return
    tank.respawnTimer -= dt
    if (tank.respawnTimer > 0) return
    const spawn =
      tank.id === this.player.id
        ? this.findSpawnPoint({ x: WORLD.width / 2, y: WORLD.height / 2 }, 0, 180)
        : this.findSpawnPoint(this.player, 680, 180)
    tank.x = spawn.x
    tank.y = spawn.y
    tank.vx = 0
    tank.vy = 0
    tank.health = tank.maxHealth
    tank.cooldown = random(0.1, 0.9)
    tank.alive = true
    tank.ai = this.createBrain()
  }

  killTank(victim: TankState, killer?: TankState) {
    victim.alive = false
    victim.respawnTimer = victim.bot ? 3.5 : 0

    let scoreAwarded = 0
    if (killer && killer.id !== victim.id) {
      scoreAwarded = 180 + victim.level * 35
      this.award(killer, 40 + victim.level * 10, scoreAwarded)
      if (killer.team !== 'neutral') {
        this.teamScores[killer.team] += 1
      }
    }

    this.events.push({
      type: 'tankDestroyed',
      victimId: victim.id,
      killerId: killer?.id,
      scoreAwarded,
    })

    if (victim.id === this.player.id && !this.watchBots) {
      this.gameOver = true
      this.events.push({
        type: 'playerDestroyed',
        playerId: this.player.id,
        score: Math.floor(this.player.score),
      })
    }
  }

  award(tank: TankState, xp: number, score: number) {
    if (!tank.alive) return
    tank.xp += xp
    tank.score += score
    while (tank.xp >= xpForNext(tank.level) && tank.level < 45) {
      tank.xp -= xpForNext(tank.level)
      this.levelUp(tank, true)
    }
  }

  levelUp(tank: TankState, grantPoint: boolean) {
    tank.level += 1
    tank.maxHealth += 4
    tank.health = Math.min(tank.maxHealth, tank.health + 18)
    if (grantPoint && (tank.level <= 28 || tank.level % 3 === 0)) {
      tank.upgradePoints += 1
    }
    if (grantPoint && tank.level % 5 === 0) {
      tank.talentPoints += 1
    }
    this.events.push({
      type: 'levelUp',
      tankId: tank.id,
      level: tank.level,
      upgradePoints: tank.upgradePoints,
      talentPoints: tank.talentPoints,
    })
  }

  upgradeStat(key?: StatKey) {
    if (!key) return false
    return this.upgradeStatFor(this.player, key)
  }

  upgradeStatFor(tank: TankState, key: StatKey) {
    if (tank.upgradePoints <= 0 || tank.stats[key] >= 7) return false
    tank.stats[key] += 1
    tank.upgradePoints -= 1
    this.applyStats(tank)
    return true
  }

  selectTalent(talentId: TalentId, tank = this.player) {
    if (!canSelectTalent(tank, talentId)) return false
    return this.grantTalent(tank, talentId, true)
  }

  grantTalent(tank: TankState, talentId: TalentId, spendPoint: boolean) {
    const talent = findTalent(talentId)
    if (!talent || tank.talents.includes(talentId)) return false
    tank.talents.push(talentId)
    tank.classBranch ??= talent.branch
    if (spendPoint) {
      tank.talentPoints = Math.max(0, tank.talentPoints - 1)
    }
    this.events.push({
      type: 'talentSelected',
      tankId: tank.id,
      talentId,
      classBranch: talent.branch,
    })
    return true
  }

  applyStats(tank: TankState) {
    const previousRatio = tank.maxHealth > 0 ? tank.health / tank.maxHealth : 1
    tank.maxHealth = 100 + tank.stats.maxHealth * 22 + (tank.level - 1) * 4
    tank.health = clamp(tank.health, 1, tank.maxHealth)
    if (previousRatio > 0.98) {
      tank.health = tank.maxHealth
    }
  }

  findTarget(tank: TankState): TargetRef | undefined {
    let best: TargetRef | undefined
    let bestScore = Number.POSITIVE_INFINITY

    for (const candidate of this.tanks) {
      if (!candidate.alive || candidate.id === tank.id) continue
      if (this.areAllies(tank, candidate)) continue
      const d = distance(tank, candidate)
      if (d > 1200) continue
      const threatBonus = candidate.id === this.player.id ? 180 : 0
      const lowHealthBonus = candidate.health / candidate.maxHealth < 0.4 ? 120 : 0
      const score = d - threatBonus - lowHealthBonus
      if (score < bestScore) {
        bestScore = score
        best = { type: 'tank', id: candidate.id }
      }
    }

    for (const shape of this.shapes) {
      const d = distance(tank, shape)
      const valueBias = shape.kind === 'pentagon' ? 180 : shape.kind === 'triangle' ? 80 : 0
      const score = d - valueBias
      if (score < bestScore) {
        bestScore = score
        best = { type: 'shape', id: shape.id }
      }
    }

    return best
  }

  targetExists(target: TargetRef) {
    if (target.type === 'shape') {
      return this.shapes.some((shape) => shape.id === target.id)
    }
    return this.tanks.some((tank) => tank.id === target.id && tank.alive)
  }

  areAllies(first: TankState, second: TankState) {
    const mode = modeDefinition(this.mode)
    return mode.teams && first.team !== 'neutral' && first.team === second.team
  }

  getTargetPoint(target: TargetRef): (Point & { type: TargetRef['type'] }) | undefined {
    if (target.type === 'shape') {
      const shape = this.shapes.find((candidate) => candidate.id === target.id)
      return shape ? { x: shape.x, y: shape.y, type: 'shape' } : undefined
    }
    const tank = this.tanks.find((candidate) => candidate.id === target.id && candidate.alive)
    return tank ? { x: tank.x, y: tank.y, type: 'tank' } : undefined
  }

  spawnShape() {
    const roll = Math.random()
    const kind: ShapeKind = roll > 0.92 ? 'pentagon' : roll > 0.58 ? 'triangle' : 'square'
    const config = SHAPE_CONFIG[kind]
    const spawn = this.findSpawnPoint(this.player, 140, 90)
    this.shapes.push({
      id: this.nextId,
      kind,
      x: spawn.x,
      y: spawn.y,
      radius: config.radius * random(0.9, 1.12),
      sides: config.sides,
      angle: random(0, Math.PI * 2),
      spin: random(-0.9, 0.9),
      health: config.health,
      maxHealth: config.health,
      xp: config.xp,
      score: config.score,
      color: config.color,
      stroke: config.stroke,
    })
    this.nextId += 1
  }

  findSpawnPoint(avoid: Point, minDistance: number, margin: number): Point {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const point = {
        x: random(margin, WORLD.width - margin),
        y: random(margin, WORLD.height - margin),
      }
      if (distance(point, avoid) >= minDistance) {
        return point
      }
    }
    return {
      x: clamp(avoid.x + minDistance, margin, WORLD.width - margin),
      y: clamp(avoid.y + minDistance * 0.5, margin, WORLD.height - margin),
    }
  }

  leader() {
    return this.tanks.filter((tank) => tank.alive).sort((a, b) => b.score - a.score)[0]
  }

  getDebugState(): DebugState {
    return {
      playerX: this.player.x,
      playerY: this.player.y,
      playerVelocity: Math.hypot(this.player.vx, this.player.vy),
      bullets: this.bullets.length,
      shapes: this.shapes.length,
      tanks: this.tanks.filter((tank) => tank.alive).length,
      score: this.player.score,
      level: this.player.level,
      talentPoints: this.player.talentPoints,
      talents: this.player.talents.length,
    }
  }

  getSnapshot(): ServerSnapshot {
    return {
      tick: this.tick,
      mode: this.mode,
      world: WORLD,
      match: {
        label: modeDefinition(this.mode).label,
        wave: this.wave,
        teamScores: { ...this.teamScores },
      },
      playerId: this.player.id,
      tanks: this.tanks.map((tank) => ({ ...tank, talents: [...tank.talents], stats: { ...tank.stats } })),
      bullets: this.bullets.map((bullet) => ({ ...bullet })),
      shapes: this.shapes.map((shape) => ({ ...shape })),
      controlPoints: this.controlPoints.map((point) => ({ ...point })),
      events: this.consumeEvents(),
    }
  }

  consumeEvents() {
    const events = this.events
    this.events = []
    return events
  }
}
