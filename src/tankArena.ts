type Point = {
  x: number
  y: number
}

type StatKey =
  | 'maxHealth'
  | 'regen'
  | 'bodyDamage'
  | 'bulletSpeed'
  | 'bulletDamage'
  | 'reload'
  | 'moveSpeed'

type ShapeKind = 'square' | 'triangle' | 'pentagon'

type TargetRef =
  | { type: 'shape'; id: number }
  | { type: 'tank'; id: number }

type StatBlock = Record<StatKey, number>

type Tank = {
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
  upgradePoints: number
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

type Bullet = {
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

type ArenaShape = {
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

type HudElements = {
  canvas: HTMLCanvasElement
  menu: HTMLElement
  menuTitle: HTMLElement
  menuStats: HTMLElement
  startButton: HTMLButtonElement
  botButton: HTMLButtonElement
  playerName: HTMLElement
  playerLevel: HTMLElement
  healthFill: HTMLElement
  xpFill: HTMLElement
  scoreValue: HTMLElement
  bestValue: HTMLElement
  leaderboardList: HTMLOListElement
  upgradePanel: HTMLElement
}

type InputState = {
  keys: Set<string>
  pointer: Point
  pointerWorld: Point
  pointerDown: boolean
  touchMove: boolean
  autoFire: boolean
}

const WORLD = {
  width: 4200,
  height: 3000,
  grid: 80,
}

const STAT_KEYS: StatKey[] = [
  'maxHealth',
  'regen',
  'bodyDamage',
  'bulletSpeed',
  'bulletDamage',
  'reload',
  'moveSpeed',
]

const STAT_LABELS: Record<StatKey, string> = {
  maxHealth: 'Max Health',
  regen: 'Regen',
  bodyDamage: 'Body Damage',
  bulletSpeed: 'Bullet Speed',
  bulletDamage: 'Bullet Damage',
  reload: 'Reload',
  moveSpeed: 'Move Speed',
}

const BOT_NAMES = [
  'Circuit',
  'Byte',
  'Patch',
  'Servo',
  'Cache',
  'Kernel',
  'Noodle',
  'Vector',
  'Juno',
  'Pixel',
  'Atlas',
  'Echo',
  'Nova',
  'Rivet',
  'Sprocket',
  'Glitch',
]

const SHAPE_CONFIG: Record<
  ShapeKind,
  {
    sides: number
    radius: number
    health: number
    xp: number
    score: number
    color: string
    stroke: string
  }
> = {
  square: {
    sides: 4,
    radius: 24,
    health: 28,
    xp: 9,
    score: 15,
    color: '#f4c542',
    stroke: '#c69417',
  },
  triangle: {
    sides: 3,
    radius: 28,
    health: 42,
    xp: 16,
    score: 28,
    color: '#ef6461',
    stroke: '#b63836',
  },
  pentagon: {
    sides: 5,
    radius: 42,
    health: 105,
    xp: 48,
    score: 90,
    color: '#5fa8ff',
    stroke: '#2d70c7',
  },
}

export class TankArena {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  hud: HudElements
  input: InputState = {
    keys: new Set(),
    pointer: { x: 0, y: 0 },
    pointerWorld: { x: WORLD.width / 2, y: WORLD.height / 2 },
    pointerDown: false,
    touchMove: false,
    autoFire: false,
  }

  tanks: Tank[] = []
  bullets: Bullet[] = []
  shapes: ArenaShape[] = []
  player!: Tank
  camera: Point = { x: WORLD.width / 2, y: WORLD.height / 2 }
  viewWidth = 1280
  viewHeight = 720
  lastTime = performance.now()
  animationId = 0
  nextId = 1
  paused = true
  started = false
  gameOver = false
  watchBots = false
  bestScore = Number(localStorage.getItem('moo-tanks-best') ?? '0')

  constructor(hud: HudElements) {
    this.hud = hud
    this.canvas = hud.canvas
    const ctx = this.canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Canvas 2D context is unavailable')
    }
    this.ctx = ctx

    this.bindEvents()
    this.resize()
    this.prepareWorld(false)
    this.showMenu('Arena Online')
    this.updateHud()
  }

  start() {
    this.lastTime = performance.now()
    this.animationId = requestAnimationFrame((time) => this.tick(time))
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize())

    window.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase()
      this.input.keys.add(key)

      if (key === 'p') {
        this.paused = !this.paused
        this.hud.menu.classList.toggle('is-hidden', !this.paused || this.gameOver)
        if (this.paused && !this.gameOver) {
          this.showMenu('Paused')
        }
      }

      if (key === 'r' && this.gameOver) {
        this.reset(false)
      }

      if (key === 'e') {
        this.input.autoFire = !this.input.autoFire
      }

      const statIndex = Number(key) - 1
      if (Number.isInteger(statIndex) && statIndex >= 0) {
        this.upgradeStat(STAT_KEYS[statIndex])
      }
    })

    window.addEventListener('keyup', (event) => {
      this.input.keys.delete(event.key.toLowerCase())
    })

    this.canvas.addEventListener('contextmenu', (event) => event.preventDefault())
    this.canvas.addEventListener('pointerdown', (event) => {
      this.canvas.setPointerCapture(event.pointerId)
      this.input.pointerDown = true
      this.input.touchMove = event.pointerType !== 'mouse'
      this.updatePointer(event)
    })
    this.canvas.addEventListener('pointermove', (event) => this.updatePointer(event))
    window.addEventListener('pointerup', () => {
      this.input.pointerDown = false
      this.input.touchMove = false
    })

    this.hud.startButton.addEventListener('click', () => this.reset(false))
    this.hud.botButton.addEventListener('click', () => this.reset(true))
    this.hud.upgradePanel.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-stat]')
      if (button) {
        this.upgradeStat(button.dataset.stat as StatKey)
      }
    })
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.viewWidth = Math.max(320, rect.width)
    this.viewHeight = Math.max(320, rect.height)
    this.canvas.width = Math.floor(this.viewWidth * dpr)
    this.canvas.height = Math.floor(this.viewHeight * dpr)
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  updatePointer(event: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect()
    this.input.pointer.x = event.clientX - rect.left
    this.input.pointer.y = event.clientY - rect.top
    this.input.pointerWorld = this.screenToWorld(this.input.pointer)
  }

  reset(watchBots: boolean) {
    this.watchBots = watchBots
    this.prepareWorld(watchBots)
    this.started = true
    this.paused = false
    this.gameOver = false
    this.hud.menu.classList.add('is-hidden')
    this.updateHud()
  }

  prepareWorld(watchBots: boolean) {
    this.nextId = 1
    this.bullets = []
    this.shapes = []
    this.tanks = []

    this.player = this.createTank('Moo', !watchBots, WORLD.width / 2, WORLD.height / 2, '#45a3ff')
    if (watchBots) {
      this.player.bot = true
      this.player.name = 'Moo Bot'
      this.player.ai = this.createBrain()
    }
    this.tanks.push(this.player)

    for (let i = 0; i < 15; i += 1) {
      const spawn = this.findSpawnPoint(this.player, 760, 220)
      const bot = this.createTank(
        BOT_NAMES[i % BOT_NAMES.length],
        false,
        spawn.x,
        spawn.y,
        pick(['#ff6b6b', '#7ed957', '#b57dff', '#ff9f43', '#36d1dc']),
      )
      bot.bot = true
      bot.ai = this.createBrain()
      for (let level = 1; level < randomInt(2, 8); level += 1) {
        this.levelUp(bot, false)
      }
      this.tanks.push(bot)
    }

    for (let i = 0; i < 95; i += 1) {
      this.spawnShape()
    }

    this.camera = { x: this.player.x, y: this.player.y }
    this.input.pointerWorld = { x: this.player.x + 200, y: this.player.y }
  }

  createTank(name: string, human: boolean, x: number, y: number, color: string): Tank {
    const stats = createStats()
    const tank: Tank = {
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
      upgradePoints: 0,
      stats,
      cooldown: 0,
      alive: true,
      respawnTimer: 0,
    }
    this.nextId += 1
    this.applyStats(tank)
    return tank
  }

  createBrain() {
    return {
      retargetIn: random(0.1, 0.8),
      strafe: pick([-1, 1]),
      wanderAngle: random(0, Math.PI * 2),
      fire: false,
    }
  }

  tick(time: number) {
    const dt = Math.min(0.045, Math.max(0.001, (time - this.lastTime) / 1000))
    this.lastTime = time

    if (!this.paused && this.started) {
      this.update(dt, time)
    }
    this.render()
    this.animationId = requestAnimationFrame((nextTime) => this.tick(nextTime))
  }

  update(dt: number, time: number) {
    while (this.shapes.length < 95) {
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
        this.updatePlayer(tank)
      }

      this.moveTank(tank, dt)
      const shouldFire = tank.bot ? Boolean(tank.ai?.fire) : this.input.pointerDown || this.input.autoFire
      if (shouldFire) {
        this.tryShoot(tank)
      }
    }

    this.updateBullets(dt, time)
    this.resolveBodyCollisions(dt, time)
    this.updateCamera(dt)
    this.updateHud()
  }

  updatePlayer(tank: Tank) {
    const move = { x: 0, y: 0 }
    if (this.input.keys.has('w') || this.input.keys.has('arrowup')) move.y -= 1
    if (this.input.keys.has('s') || this.input.keys.has('arrowdown')) move.y += 1
    if (this.input.keys.has('a') || this.input.keys.has('arrowleft')) move.x -= 1
    if (this.input.keys.has('d') || this.input.keys.has('arrowright')) move.x += 1

    if (this.input.touchMove && this.input.pointerDown) {
      const toward = normalize({
        x: this.input.pointerWorld.x - tank.x,
        y: this.input.pointerWorld.y - tank.y,
      })
      move.x += toward.x
      move.y += toward.y
    }

    const direction = normalize(move)
    const speed = moveSpeed(tank)
    tank.vx += direction.x * speed * 8 * (1 / 60)
    tank.vy += direction.y * speed * 8 * (1 / 60)
    tank.aimAngle = Math.atan2(this.input.pointerWorld.y - tank.y, this.input.pointerWorld.x - tank.x)
    tank.angle = lerpAngle(tank.angle, tank.aimAngle, 0.24)
  }

  updateBot(tank: Tank, dt: number) {
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
      this.accelerate(tank, wander, 0.68)
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

    this.accelerate(tank, normalize(movement), 0.82)
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

  accelerate(tank: Tank, direction: Point, multiplier: number) {
    const speed = moveSpeed(tank)
    tank.vx += direction.x * speed * 7.5 * multiplier * (1 / 60)
    tank.vy += direction.y * speed * 7.5 * multiplier * (1 / 60)
  }

  moveTank(tank: Tank, dt: number) {
    tank.vx *= Math.pow(0.0018, dt)
    tank.vy *= Math.pow(0.0018, dt)
    const maxSpeed = moveSpeed(tank)
    const velocity = length(tank)
    if (velocity > maxSpeed) {
      tank.vx = (tank.vx / velocity) * maxSpeed
      tank.vy = (tank.vy / velocity) * maxSpeed
    }

    tank.x = clamp(tank.x + tank.vx * dt, tank.radius, WORLD.width - tank.radius)
    tank.y = clamp(tank.y + tank.vy * dt, tank.radius, WORLD.height - tank.radius)
  }

  tryShoot(tank: Tank) {
    if (!tank.alive || tank.cooldown > 0) return
    const speed = bulletSpeed(tank)
    const barrelLength = tank.radius + 28
    const recoil = tank.radius * 0.2
    const muzzle = {
      x: tank.x + Math.cos(tank.angle) * barrelLength,
      y: tank.y + Math.sin(tank.angle) * barrelLength,
    }
    const spread = random(-0.025, 0.025)
    const angle = tank.angle + spread
    this.bullets.push({
      id: this.nextId,
      ownerId: tank.id,
      x: muzzle.x,
      y: muzzle.y,
      vx: Math.cos(angle) * speed + tank.vx * 0.2,
      vy: Math.sin(angle) * speed + tank.vy * 0.2,
      radius: 7 + tank.stats.bulletDamage * 0.25,
      damage: bulletDamage(tank),
      life: 1.45 + tank.stats.bulletSpeed * 0.03,
      color: tank.accent,
    })
    this.nextId += 1
    tank.cooldown = reloadTime(tank)
    tank.vx -= Math.cos(tank.angle) * recoil * 5
    tank.vy -= Math.sin(tank.angle) * recoil * 5
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

  hitShapes(bullet: Bullet, time: number) {
    for (let i = this.shapes.length - 1; i >= 0; i -= 1) {
      const shape = this.shapes[i]
      if (distance(bullet, shape) > bullet.radius + shape.radius) continue

      shape.health -= bullet.damage
      const owner = this.tanks.find((tank) => tank.id === bullet.ownerId)
      if (owner) {
        owner.score += Math.ceil(bullet.damage * 0.18)
      }
      if (shape.health <= 0) {
        this.shapes.splice(i, 1)
        if (owner) {
          this.award(owner, shape.xp, shape.score)
        }
      }
      this.nudgeOwner(bullet, shape, time)
      return true
    }
    return false
  }

  hitTanks(bullet: Bullet, time: number) {
    for (const tank of this.tanks) {
      if (!tank.alive || tank.id === bullet.ownerId) continue
      if (distance(bullet, tank) > bullet.radius + tank.radius) continue

      tank.health -= bullet.damage
      tank.lastHitAt = time
      tank.vx += bullet.vx * 0.022
      tank.vy += bullet.vy * 0.022
      const owner = this.tanks.find((candidate) => candidate.id === bullet.ownerId)
      if (tank.health <= 0) {
        this.killTank(tank, owner)
      }
      return true
    }
    return false
  }

  nudgeOwner(bullet: Bullet, shape: ArenaShape, time: number) {
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
        const gap = tank.radius + shape.radius - distance(tank, shape)
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
        const gap = first.radius + second.radius - distance(first, second)
        if (gap <= 0) continue
        const away = normalize({ x: first.x - second.x, y: first.y - second.y })
        first.x += away.x * gap * 0.5
        first.y += away.y * gap * 0.5
        second.x -= away.x * gap * 0.5
        second.y -= away.y * gap * 0.5
        first.health -= bodyDamage(second) * dt
        second.health -= bodyDamage(first) * dt
        first.lastHitAt = time
        second.lastHitAt = time
        if (first.health <= 0) this.killTank(first, second)
        if (second.health <= 0) this.killTank(second, first)
      }
    }
  }

  regenerate(tank: Tank, dt: number, time: number) {
    if (time - tank.lastHitAt < 2600) return
    tank.health = Math.min(tank.maxHealth, tank.health + regenRate(tank) * dt)
  }

  updateRespawn(tank: Tank, dt: number) {
    if (!tank.bot) return
    tank.respawnTimer -= dt
    if (tank.respawnTimer > 0) return
    const spawn = tank.id === this.player.id ? this.findSpawnPoint({ x: WORLD.width / 2, y: WORLD.height / 2 }, 0, 180) : this.findSpawnPoint(this.player, 680, 180)
    tank.x = spawn.x
    tank.y = spawn.y
    tank.vx = 0
    tank.vy = 0
    tank.health = tank.maxHealth
    tank.cooldown = random(0.1, 0.9)
    tank.alive = true
    tank.ai = this.createBrain()
  }

  killTank(victim: Tank, killer?: Tank) {
    victim.alive = false
    victim.respawnTimer = victim.bot ? 3.5 : 0

    if (killer && killer.id !== victim.id) {
      this.award(killer, 40 + victim.level * 10, 180 + victim.level * 35)
    }

    if (victim.id === this.player.id && !this.watchBots) {
      this.gameOver = true
      this.paused = true
      this.bestScore = Math.max(this.bestScore, Math.floor(this.player.score))
      localStorage.setItem('moo-tanks-best', String(this.bestScore))
      this.showMenu('Tank Destroyed')
    }
  }

  award(tank: Tank, xp: number, score: number) {
    if (!tank.alive) return
    tank.xp += xp
    tank.score += score
    while (tank.xp >= xpForNext(tank.level) && tank.level < 45) {
      tank.xp -= xpForNext(tank.level)
      this.levelUp(tank, true)
    }
    if (tank.id === this.player.id) {
      this.bestScore = Math.max(this.bestScore, Math.floor(tank.score))
      localStorage.setItem('moo-tanks-best', String(this.bestScore))
    }
  }

  levelUp(tank: Tank, grantPoint: boolean) {
    tank.level += 1
    tank.maxHealth += 4
    tank.health = Math.min(tank.maxHealth, tank.health + 18)
    if (grantPoint && (tank.level <= 28 || tank.level % 3 === 0)) {
      tank.upgradePoints += 1
    }
  }

  upgradeStat(key?: StatKey) {
    if (!key) return
    this.upgradeStatFor(this.player, key)
    this.updateHud()
  }

  upgradeStatFor(tank: Tank, key: StatKey) {
    if (tank.upgradePoints <= 0 || tank.stats[key] >= 7) return false
    tank.stats[key] += 1
    tank.upgradePoints -= 1
    this.applyStats(tank)
    return true
  }

  applyStats(tank: Tank) {
    const previousRatio = tank.maxHealth > 0 ? tank.health / tank.maxHealth : 1
    tank.maxHealth = 100 + tank.stats.maxHealth * 22 + (tank.level - 1) * 4
    tank.health = clamp(tank.health, 1, tank.maxHealth)
    if (previousRatio > 0.98) {
      tank.health = tank.maxHealth
    }
  }

  findTarget(tank: Tank): TargetRef | undefined {
    let best: TargetRef | undefined
    let bestScore = Number.POSITIVE_INFINITY

    for (const candidate of this.tanks) {
      if (!candidate.alive || candidate.id === tank.id) continue
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

  updateCamera(dt: number) {
    const focus = this.watchBots ? this.leader() : this.player
    if (!focus) return
    const followStrength = 1 - Math.pow(0.0004, dt)
    this.camera.x = lerp(this.camera.x, focus.x, followStrength)
    this.camera.y = lerp(this.camera.y, focus.y, followStrength)
    this.camera.x = clamp(this.camera.x, this.viewWidth / 2, WORLD.width - this.viewWidth / 2)
    this.camera.y = clamp(this.camera.y, this.viewHeight / 2, WORLD.height - this.viewHeight / 2)
    this.input.pointerWorld = this.screenToWorld(this.input.pointer)
  }

  leader() {
    return this.tanks.filter((tank) => tank.alive).sort((a, b) => b.score - a.score)[0]
  }

  screenToWorld(point: Point): Point {
    return {
      x: point.x + this.camera.x - this.viewWidth / 2,
      y: point.y + this.camera.y - this.viewHeight / 2,
    }
  }

  worldToScreen(point: Point): Point {
    return {
      x: point.x - this.camera.x + this.viewWidth / 2,
      y: point.y - this.camera.y + this.viewHeight / 2,
    }
  }

  render() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.ctx.clearRect(0, 0, this.viewWidth, this.viewHeight)
    this.drawBackground()

    this.ctx.save()
    this.ctx.translate(this.viewWidth / 2 - this.camera.x, this.viewHeight / 2 - this.camera.y)
    this.drawWorld()
    for (const shape of this.shapes) {
      this.drawShape(shape)
    }
    for (const bullet of this.bullets) {
      this.drawBullet(bullet)
    }
    for (const tank of this.tanks) {
      if (tank.alive) {
        this.drawTank(tank)
      }
    }
    this.ctx.restore()

    this.drawMinimap()
    if (this.paused && this.started && !this.gameOver) {
      this.drawPauseWash()
    }
  }

  drawBackground() {
    const gradient = this.ctx.createLinearGradient(0, 0, this.viewWidth, this.viewHeight)
    gradient.addColorStop(0, '#f6f8fb')
    gradient.addColorStop(1, '#eef4ef')
    this.ctx.fillStyle = gradient
    this.ctx.fillRect(0, 0, this.viewWidth, this.viewHeight)
  }

  drawWorld() {
    const left = this.camera.x - this.viewWidth / 2
    const top = this.camera.y - this.viewHeight / 2
    const right = left + this.viewWidth
    const bottom = top + this.viewHeight
    const startX = Math.floor(left / WORLD.grid) * WORLD.grid
    const startY = Math.floor(top / WORLD.grid) * WORLD.grid

    this.ctx.strokeStyle = '#d7dde5'
    this.ctx.lineWidth = 1
    this.ctx.beginPath()
    for (let x = startX; x <= right; x += WORLD.grid) {
      this.ctx.moveTo(x, top)
      this.ctx.lineTo(x, bottom)
    }
    for (let y = startY; y <= bottom; y += WORLD.grid) {
      this.ctx.moveTo(left, y)
      this.ctx.lineTo(right, y)
    }
    this.ctx.stroke()

    this.ctx.strokeStyle = '#99a6b8'
    this.ctx.lineWidth = 8
    this.ctx.strokeRect(0, 0, WORLD.width, WORLD.height)
  }

  drawShape(shape: ArenaShape) {
    this.ctx.save()
    this.ctx.translate(shape.x, shape.y)
    this.ctx.rotate(shape.angle)
    this.ctx.beginPath()
    for (let i = 0; i < shape.sides; i += 1) {
      const angle = (Math.PI * 2 * i) / shape.sides - Math.PI / 2
      const x = Math.cos(angle) * shape.radius
      const y = Math.sin(angle) * shape.radius
      if (i === 0) this.ctx.moveTo(x, y)
      else this.ctx.lineTo(x, y)
    }
    this.ctx.closePath()
    this.ctx.fillStyle = shape.color
    this.ctx.strokeStyle = shape.stroke
    this.ctx.lineWidth = 5
    this.ctx.fill()
    this.ctx.stroke()
    this.ctx.restore()

    if (shape.health < shape.maxHealth) {
      this.drawBar(shape.x, shape.y - shape.radius - 18, shape.radius * 1.5, 6, shape.health / shape.maxHealth, '#f25555')
    }
  }

  drawBullet(bullet: Bullet) {
    this.ctx.beginPath()
    this.ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2)
    this.ctx.fillStyle = bullet.color
    this.ctx.strokeStyle = '#39414d'
    this.ctx.lineWidth = 2
    this.ctx.fill()
    this.ctx.stroke()
  }

  drawTank(tank: Tank) {
    this.ctx.save()
    this.ctx.translate(tank.x, tank.y)
    this.ctx.rotate(tank.angle)
    this.ctx.fillStyle = tank.accent
    this.ctx.strokeStyle = '#2d3642'
    this.ctx.lineWidth = 5
    this.roundRect(4, -9, tank.radius + 36, 18, 8)
    this.ctx.fill()
    this.ctx.stroke()
    this.ctx.restore()

    this.ctx.beginPath()
    this.ctx.arc(tank.x, tank.y, tank.radius, 0, Math.PI * 2)
    this.ctx.fillStyle = tank.color
    this.ctx.strokeStyle = '#2d3642'
    this.ctx.lineWidth = tank.id === this.player.id ? 6 : 4
    this.ctx.fill()
    this.ctx.stroke()

    const screen = this.worldToScreen(tank)
    if (screen.x > -120 && screen.x < this.viewWidth + 120 && screen.y > -120 && screen.y < this.viewHeight + 120) {
      this.ctx.font = '600 13px Inter, system-ui, sans-serif'
      this.ctx.textAlign = 'center'
      this.ctx.fillStyle = '#27313d'
      this.ctx.fillText(tank.name, tank.x, tank.y - tank.radius - 26)
      this.drawBar(tank.x, tank.y - tank.radius - 17, 58, 7, tank.health / tank.maxHealth, tank.id === this.player.id ? '#40c463' : '#ff6b6b')
    }
  }

  drawBar(x: number, y: number, width: number, height: number, ratio: number, color: string) {
    this.ctx.fillStyle = 'rgba(35, 43, 52, 0.22)'
    this.roundRect(x - width / 2, y, width, height, height / 2)
    this.ctx.fill()
    this.ctx.fillStyle = color
    this.roundRect(x - width / 2, y, width * clamp(ratio, 0, 1), height, height / 2)
    this.ctx.fill()
  }

  roundRect(x: number, y: number, width: number, height: number, radius: number) {
    const r = Math.min(radius, width / 2, height / 2)
    this.ctx.beginPath()
    this.ctx.moveTo(x + r, y)
    this.ctx.lineTo(x + width - r, y)
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + r)
    this.ctx.lineTo(x + width, y + height - r)
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
    this.ctx.lineTo(x + r, y + height)
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - r)
    this.ctx.lineTo(x, y + r)
    this.ctx.quadraticCurveTo(x, y, x + r, y)
  }

  drawMinimap() {
    const width = Math.min(190, this.viewWidth * 0.22)
    const height = width * (WORLD.height / WORLD.width)
    const x = this.viewWidth - width - 18
    const y = this.viewHeight - height - 18
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.76)'
    this.ctx.strokeStyle = 'rgba(39, 49, 61, 0.34)'
    this.ctx.lineWidth = 2
    this.roundRect(x, y, width, height, 7)
    this.ctx.fill()
    this.ctx.stroke()

    for (const shape of this.shapes) {
      if (shape.kind !== 'pentagon') continue
      this.ctx.fillStyle = '#5fa8ff'
      this.ctx.fillRect(x + (shape.x / WORLD.width) * width - 1.5, y + (shape.y / WORLD.height) * height - 1.5, 3, 3)
    }

    for (const tank of this.tanks) {
      if (!tank.alive) continue
      this.ctx.fillStyle = tank.id === this.player.id ? '#111827' : tank.color
      this.ctx.beginPath()
      this.ctx.arc(x + (tank.x / WORLD.width) * width, y + (tank.y / WORLD.height) * height, tank.id === this.player.id ? 4 : 3, 0, Math.PI * 2)
      this.ctx.fill()
    }
  }

  drawPauseWash() {
    this.ctx.fillStyle = 'rgba(247, 249, 252, 0.42)'
    this.ctx.fillRect(0, 0, this.viewWidth, this.viewHeight)
  }

  updateHud() {
    const player = this.player
    this.hud.playerName.textContent = player.name
    this.hud.playerLevel.textContent = `Level ${player.level}`
    this.hud.healthFill.style.width = `${clamp((player.health / player.maxHealth) * 100, 0, 100)}%`
    this.hud.xpFill.style.width = `${clamp((player.xp / xpForNext(player.level)) * 100, 0, 100)}%`
    this.hud.scoreValue.textContent = Math.floor(player.score).toLocaleString()
    this.hud.bestValue.textContent = Math.floor(this.bestScore).toLocaleString()
    this.hud.menuStats.textContent = `${this.tanks.filter((tank) => tank.alive && tank.bot).length} bots active`

    const leaders = [...this.tanks].sort((a, b) => b.score - a.score).slice(0, 7)
    this.hud.leaderboardList.innerHTML = leaders
      .map((tank) => `<li><span>${tank.name}</span><strong>${Math.floor(tank.score).toLocaleString()}</strong></li>`)
      .join('')

    this.hud.upgradePanel.innerHTML = STAT_KEYS.map((key, index) => {
      const value = player.stats[key]
      const disabled = player.upgradePoints <= 0 || value >= 7 || !player.alive || this.watchBots
      return `
        <button type="button" data-stat="${key}" ${disabled ? 'disabled' : ''}>
          <span class="upgrade-label">${index + 1}. ${STAT_LABELS[key]}</span>
          <span class="upgrade-track"><span style="width: ${(value / 7) * 100}%"></span></span>
        </button>
      `
    }).join('')
    this.hud.upgradePanel.dataset.points = `${this.watchBots ? 0 : player.upgradePoints}`
  }

  showMenu(title: string) {
    this.hud.menuTitle.textContent = title
    this.hud.menu.classList.remove('is-hidden')
  }
}

function createStats(): StatBlock {
  return {
    maxHealth: 0,
    regen: 0,
    bodyDamage: 0,
    bulletSpeed: 0,
    bulletDamage: 0,
    reload: 0,
    moveSpeed: 0,
  }
}

function moveSpeed(tank: Tank) {
  return 238 + tank.stats.moveSpeed * 19 - tank.level * 0.4
}

function bulletSpeed(tank: Tank) {
  return 650 + tank.stats.bulletSpeed * 62
}

function bulletDamage(tank: Tank) {
  return 16 + tank.stats.bulletDamage * 5.5 + tank.level * 0.26
}

function reloadTime(tank: Tank) {
  return Math.max(0.13, 0.46 - tank.stats.reload * 0.044)
}

function bodyDamage(tank: Tank) {
  return 14 + tank.stats.bodyDamage * 5
}

function regenRate(tank: Tank) {
  return 5 + tank.stats.regen * 2.8
}

function xpForNext(level: number) {
  return Math.floor(44 + level * 18 + Math.pow(level, 1.55) * 8)
}

function random(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function randomInt(min: number, max: number) {
  return Math.floor(random(min, max + 1))
}

function pick<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)]
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function length(point: Point) {
  return Math.hypot(point.x, point.y)
}

function normalize(point: Point): Point {
  const magnitude = length(point)
  if (magnitude <= 0.0001) {
    return { x: 0, y: 0 }
  }
  return { x: point.x / magnitude, y: point.y / magnitude }
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t
}

function lerpAngle(from: number, to: number, t: number) {
  return from + angleDelta(from, to) * t
}

function angleDelta(from: number, to: number) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from))
}

function lighten(hex: string, amount: number) {
  const value = Number.parseInt(hex.slice(1), 16)
  const r = clamp(((value >> 16) & 255) + 255 * amount, 0, 255)
  const g = clamp(((value >> 8) & 255) + 255 * amount, 0, 255)
  const b = clamp((value & 255) + 255 * amount, 0, 255)
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
}
