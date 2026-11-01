import { LocalTankSimulation } from './simulation/localSimulation'
import type {
  BulletState as Bullet,
  ClientInput,
  ControlPointState,
  MatchMode,
  Point,
  ShapeState as ArenaShape,
  StatKey,
  TankState as Tank,
} from './simulation/protocol'
import { MODE_DEFINITIONS, modeDefinition } from './simulation/modes'
import { STAT_KEYS, STAT_LABELS } from './simulation/rules'
import { TALENTS } from './simulation/talents'

type HudElements = {
  canvas: HTMLCanvasElement
  menu: HTMLElement
  menuTitle: HTMLElement
  menuStats: HTMLElement
  modeGrid: HTMLElement
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
  talentPanel: HTMLElement
}

type InputState = {
  keys: Set<string>
  pointer: Point
  pointerWorld: Point
  pointerDown: boolean
  touchMove: boolean
  autoFire: boolean
}

type DebugState = {
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

type HudSnapshot = {
  playerName: string
  playerLevel: string
  healthWidth: string
  xpWidth: string
  scoreValue: string
  bestValue: string
  menuStats: string
  modeButtons: string
  upgradePoints: string
  leaderboard: string
  upgrades: string
  talentPoints: string
  talents: string
}

const WORLD = {
  width: 4200,
  height: 3000,
  grid: 80,
}

const RENDER_SCALE = 1
const HUD_INTERVAL = 0.1

export class TankArena {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  hud: HudElements
  simulation: LocalTankSimulation
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
  controlPoints: ControlPointState[] = []
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
  selectedMode: MatchMode = 'freeForAll'
  bestScore = Number(localStorage.getItem('moo-tanks-best') ?? '0')
  hudTimer = 0
  collisionTimer = 0
  cachedDpr = RENDER_SCALE
  hudSnapshot: Partial<HudSnapshot> = {}

  constructor(hud: HudElements) {
    this.hud = hud
    this.canvas = hud.canvas
    const ctx = this.canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Canvas 2D context is unavailable')
    }
    this.ctx = ctx
    this.simulation = new LocalTankSimulation(false)

    this.bindEvents()
    this.resize()
    this.prepareWorld('freeForAll')
    this.showMenu('Arena Online')
    this.updateHud(true)
  }

  syncFromSimulation() {
    this.tanks = this.simulation.tanks
    this.bullets = this.simulation.bullets
    this.shapes = this.simulation.shapes
    this.controlPoints = this.simulation.controlPoints
    this.player = this.simulation.player
    this.watchBots = this.simulation.watchBots
  }

  start() {
    this.lastTime = performance.now()
    this.animationId = requestAnimationFrame((time) => this.tick(time))
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize())

    window.addEventListener('keydown', (event) => {
      const key = normalizeKey(event)
      if (!key) return
      if (isGameKey(key)) {
        event.preventDefault()
      }
      this.input.keys.add(key)

      if (key === 'p') {
        this.paused = !this.paused
        this.hud.menu.classList.toggle('is-hidden', !this.paused || this.gameOver)
        if (this.paused && !this.gameOver) {
          this.showMenu('Paused')
        }
      }

      if (key === 'r' && this.gameOver) {
        this.reset(this.selectedMode)
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
      const key = normalizeKey(event)
      if (key) {
        this.input.keys.delete(key)
      }
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

    this.hud.startButton.addEventListener('click', () => this.reset(this.selectedMode))
    this.hud.botButton.addEventListener('click', () => {
      this.selectedMode = 'botBrawl'
      this.reset('botBrawl')
    })
    this.hud.modeGrid.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-mode]')
      if (!button) return
      this.selectedMode = button.dataset.mode as MatchMode
      this.updateModeButtons(true)
      this.updateHud(true)
    })
    this.hud.upgradePanel.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-stat]')
      if (button) {
        this.upgradeStat(button.dataset.stat as StatKey)
      }
    })
    this.hud.talentPanel.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-talent]')
      if (button) {
        this.selectTalent(button.dataset.talent as Parameters<LocalTankSimulation['selectTalent']>[0])
      }
    })
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect()
    const dpr = RENDER_SCALE
    this.cachedDpr = dpr
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

  reset(mode: MatchMode | boolean) {
    this.selectedMode = typeof mode === 'boolean' ? (mode ? 'botBrawl' : 'freeForAll') : mode
    this.prepareWorld(this.selectedMode)
    this.started = true
    this.paused = false
    this.gameOver = false
    this.hud.menu.classList.add('is-hidden')
    this.canvas.focus({ preventScroll: true })
    this.updateHud(true)
  }

  prepareWorld(mode: MatchMode) {
    this.simulation.reset(mode)
    this.syncFromSimulation()
    this.camera = { x: this.player.x, y: this.player.y }
    this.input.pointerWorld = { x: this.player.x + 200, y: this.player.y }
    this.updateModeButtons(true)
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
    const wasGameOver = this.gameOver
    this.simulation.update(dt, time, this.readClientInput())
    this.syncFromSimulation()
    if (this.player.score > this.bestScore) {
      this.bestScore = Math.max(this.bestScore, Math.floor(this.player.score))
      localStorage.setItem('moo-tanks-best', String(this.bestScore))
    }
    if (this.simulation.gameOver && !wasGameOver && !this.watchBots) {
      this.gameOver = true
      this.paused = true
      this.bestScore = Math.max(this.bestScore, Math.floor(this.player.score))
      localStorage.setItem('moo-tanks-best', String(this.bestScore))
      this.showMenu('Tank Destroyed')
    }
    this.updateCamera(dt)
    this.hudTimer += dt
    if (this.hudTimer >= HUD_INTERVAL) {
      this.hudTimer = 0
      this.updateHud(false)
    }
  }

  readClientInput(): ClientInput {
    const move = { x: 0, y: 0 }
    if (this.input.keys.has('w') || this.input.keys.has('arrowup')) move.y -= 1
    if (this.input.keys.has('s') || this.input.keys.has('arrowdown')) move.y += 1
    if (this.input.keys.has('a') || this.input.keys.has('arrowleft')) move.x -= 1
    if (this.input.keys.has('d') || this.input.keys.has('arrowright')) move.x += 1

    if (this.input.touchMove && this.input.pointerDown) {
      const toward = normalize({
        x: this.input.pointerWorld.x - this.player.x,
        y: this.input.pointerWorld.y - this.player.y,
      })
      move.x += toward.x
      move.y += toward.y
    }

    return {
      movement: move,
      aimAngle: Math.atan2(this.input.pointerWorld.y - this.player.y, this.input.pointerWorld.x - this.player.x),
      fire: this.input.pointerDown,
      autoFire: this.input.autoFire,
    }
  }

  upgradeStat(key?: StatKey) {
    if (!key) return
    this.simulation.upgradeStat(key)
    this.syncFromSimulation()
    this.updateHud()
  }

  selectTalent(talentId?: Parameters<LocalTankSimulation['selectTalent']>[0]) {
    if (!talentId) return
    this.simulation.selectTalent(talentId)
    this.syncFromSimulation()
    this.updateHud()
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
    const dpr = this.cachedDpr
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.ctx.clearRect(0, 0, this.viewWidth, this.viewHeight)
    this.drawBackground()

    this.ctx.save()
    this.ctx.translate(this.viewWidth / 2 - this.camera.x, this.viewHeight / 2 - this.camera.y)
    this.drawWorld()
    for (const point of this.controlPoints) {
      if (this.isVisible(point, point.radius + 12)) {
        this.drawControlPoint(point)
      }
    }
    for (const shape of this.shapes) {
      if (this.isVisible(shape, shape.radius + 34)) {
        this.drawShape(shape)
      }
    }
    for (const bullet of this.bullets) {
      if (this.isVisible(bullet, bullet.radius + 8)) {
        this.drawBullet(bullet)
      }
    }
    for (const tank of this.tanks) {
      if (tank.alive && this.isVisible(tank, tank.radius + 70)) {
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
    this.ctx.fillStyle = '#f2f6fb'
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

  drawControlPoint(point: ControlPointState) {
    const ownerColor =
      point.owner === 'blue' ? 'rgba(69, 163, 255, 0.26)' : point.owner === 'red' ? 'rgba(255, 107, 107, 0.26)' : 'rgba(39, 49, 61, 0.1)'
    const progressColor = point.progress >= 0 ? '#45a3ff' : '#ff6b6b'
    this.ctx.beginPath()
    this.ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2)
    this.ctx.fillStyle = ownerColor
    this.ctx.strokeStyle = 'rgba(39, 49, 61, 0.32)'
    this.ctx.lineWidth = 4
    this.ctx.fill()
    this.ctx.stroke()

    this.ctx.beginPath()
    this.ctx.arc(point.x, point.y, point.radius - 10, -Math.PI / 2, -Math.PI / 2 + Math.abs(point.progress) * Math.PI * 2)
    this.ctx.strokeStyle = progressColor
    this.ctx.lineWidth = 7
    this.ctx.stroke()

    this.ctx.font = '900 24px Inter, system-ui, sans-serif'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillStyle = '#263243'
    this.ctx.fillText(point.label, point.x, point.y)
    this.ctx.textBaseline = 'alphabetic'
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

  isVisible(entity: Point, margin: number) {
    const left = this.camera.x - this.viewWidth / 2 - margin
    const top = this.camera.y - this.viewHeight / 2 - margin
    const right = this.camera.x + this.viewWidth / 2 + margin
    const bottom = this.camera.y + this.viewHeight / 2 + margin
    return entity.x >= left && entity.x <= right && entity.y >= top && entity.y <= bottom
  }

  updateHud(force = false) {
    const player = this.player
    const playerName = player.name
    const playerLevel = player.classBranch ? `Level ${player.level} - ${player.classBranch}` : `Level ${player.level}`
    const healthWidth = `${Math.round(clamp((player.health / player.maxHealth) * 100, 0, 100))}%`
    const xpWidth = `${Math.round(clamp((player.xp / xpForNext(player.level)) * 100, 0, 100))}%`
    const scoreValue = Math.floor(player.score).toLocaleString()
    const bestValue = Math.floor(this.bestScore).toLocaleString()
    const mode = modeDefinition(this.selectedMode)
    const botCount = this.paused ? mode.botCount : this.tanks.filter((tank) => tank.alive && tank.bot).length
    const menuStats = `${mode.label} - ${botCount} bots active`

    this.setText(this.hud.playerName, 'playerName', playerName, force)
    this.setText(this.hud.playerLevel, 'playerLevel', playerLevel, force)
    this.setStyleWidth(this.hud.healthFill, 'healthWidth', healthWidth, force)
    this.setStyleWidth(this.hud.xpFill, 'xpWidth', xpWidth, force)
    this.setText(this.hud.scoreValue, 'scoreValue', scoreValue, force)
    this.setText(this.hud.bestValue, 'bestValue', bestValue, force)
    this.setText(this.hud.menuStats, 'menuStats', menuStats, force)
    this.updateModeButtons(force)

    const leaders = [...this.tanks].sort((a, b) => b.score - a.score).slice(0, 7)
    const leaderboard = leaders
      .map((tank) => `<li><span>${tank.name}</span><strong>${Math.floor(tank.score).toLocaleString()}</strong></li>`)
      .join('')
    if (force || this.hudSnapshot.leaderboard !== leaderboard) {
      this.hud.leaderboardList.innerHTML = leaderboard
      this.hudSnapshot.leaderboard = leaderboard
    }

    const upgrades = STAT_KEYS.map((key, index) => {
      const value = player.stats[key]
      const disabled = player.upgradePoints <= 0 || value >= 7 || !player.alive || this.watchBots
      return `
        <button type="button" data-stat="${key}" ${disabled ? 'disabled' : ''}>
          <span class="upgrade-label">${index + 1}. ${STAT_LABELS[key]}</span>
          <span class="upgrade-track"><span style="width: ${(value / 7) * 100}%"></span></span>
        </button>
      `
    }).join('')
    if (force || this.hudSnapshot.upgrades !== upgrades) {
      this.hud.upgradePanel.innerHTML = upgrades
      this.hudSnapshot.upgrades = upgrades
    }

    const upgradePoints = `${this.watchBots ? 0 : player.upgradePoints}`
    if (force || this.hudSnapshot.upgradePoints !== upgradePoints) {
      this.hud.upgradePanel.dataset.points = upgradePoints
      this.hudSnapshot.upgradePoints = upgradePoints
    }

    const talents = TALENTS.map((talent) => {
      const selected = player.talents.includes(talent.id)
      const locked = player.level < talent.minLevel
      const disabled = selected || locked || player.talentPoints <= 0 || !player.alive || this.watchBots
      const state = selected ? 'Selected' : locked ? `Lvl ${talent.minLevel}` : 'Ready'
      return `
        <button type="button" data-talent="${talent.id}" ${disabled ? 'disabled' : ''} class="${selected ? 'is-selected' : ''}">
          <span class="talent-name">${talent.shortLabel}</span>
          <span class="talent-state">${state}</span>
        </button>
      `
    }).join('')
    if (force || this.hudSnapshot.talents !== talents) {
      this.hud.talentPanel.innerHTML = talents
      this.hudSnapshot.talents = talents
    }

    const talentPoints = `${this.watchBots ? 0 : player.talentPoints}`
    if (force || this.hudSnapshot.talentPoints !== talentPoints) {
      this.hud.talentPanel.dataset.points = talentPoints
      this.hudSnapshot.talentPoints = talentPoints
    }
  }

  updateModeButtons(force = false) {
    const modeButtons = MODE_DEFINITIONS.filter((mode) => mode.id !== 'botBrawl')
      .map(
        (mode) => `
          <button type="button" data-mode="${mode.id}" class="${mode.id === this.selectedMode ? 'is-selected' : ''}">
            ${mode.shortLabel}
          </button>
        `,
      )
      .join('')
    if (force || this.hudSnapshot.modeButtons !== modeButtons) {
      this.hud.modeGrid.innerHTML = modeButtons
      this.hudSnapshot.modeButtons = modeButtons
    }
  }

  setText(element: HTMLElement, key: keyof HudSnapshot, value: string, force: boolean) {
    if (force || this.hudSnapshot[key] !== value) {
      element.textContent = value
      this.hudSnapshot[key] = value
    }
  }

  setStyleWidth(element: HTMLElement, key: keyof HudSnapshot, value: string, force: boolean) {
    if (force || this.hudSnapshot[key] !== value) {
      element.style.width = value
      this.hudSnapshot[key] = value
    }
  }

  showMenu(title: string) {
    this.hud.menuTitle.textContent = title
    this.hud.menu.classList.remove('is-hidden')
  }

  getDebugState(): DebugState {
    return this.simulation.getDebugState()
  }

  benchmark(frames = 300) {
    const wasPaused = this.paused
    const wasStarted = this.started
    this.paused = false
    this.started = true
    const start = performance.now()
    let time = start
    for (let frame = 0; frame < frames; frame += 1) {
      time += 1000 / 240
      this.update(1 / 240, time)
      this.render()
    }
    const elapsedMs = performance.now() - start
    this.paused = wasPaused
    this.started = wasStarted
    this.updateHud(true)
    return {
      frames,
      elapsedMs,
      fps: Math.round((frames / elapsedMs) * 1000),
      state: this.getDebugState(),
    }
  }
}

function xpForNext(level: number) {
  return Math.floor(44 + level * 18 + Math.pow(level, 1.55) * 8)
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

function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t
}

function normalizeKey(event: KeyboardEvent) {
  const codeMap: Record<string, string> = {
    KeyW: 'w',
    KeyA: 'a',
    KeyS: 's',
    KeyD: 'd',
    ArrowUp: 'arrowup',
    ArrowDown: 'arrowdown',
    ArrowLeft: 'arrowleft',
    ArrowRight: 'arrowright',
    KeyE: 'e',
    KeyP: 'p',
    KeyR: 'r',
    Digit1: '1',
    Digit2: '2',
    Digit3: '3',
    Digit4: '4',
    Digit5: '5',
    Digit6: '6',
    Digit7: '7',
  }
  return codeMap[event.code] ?? event.key.toLowerCase()
}

function isGameKey(key: string) {
  return (
    key === 'w' ||
    key === 'a' ||
    key === 's' ||
    key === 'd' ||
    key === 'arrowup' ||
    key === 'arrowdown' ||
    key === 'arrowleft' ||
    key === 'arrowright' ||
    key === 'e' ||
    key === 'p' ||
    key === 'r' ||
    /^[1-7]$/.test(key)
  )
}
