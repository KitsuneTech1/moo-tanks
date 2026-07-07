import type { Point, ShapeKind, StatBlock, StatKey, TankState } from './protocol'
import { hasTalent } from './talents'

export const WORLD = {
  width: 4200,
  height: 3000,
  grid: 80,
}

export const TARGET_SHAPES = 82
export const COLLISION_INTERVAL = 1 / 30

export const STAT_KEYS: StatKey[] = [
  'maxHealth',
  'regen',
  'bodyDamage',
  'bulletSpeed',
  'bulletDamage',
  'reload',
  'moveSpeed',
]

export const STAT_LABELS: Record<StatKey, string> = {
  maxHealth: 'Max Health',
  regen: 'Regen',
  bodyDamage: 'Body Damage',
  bulletSpeed: 'Bullet Speed',
  bulletDamage: 'Bullet Damage',
  reload: 'Reload',
  moveSpeed: 'Move Speed',
}

export const BOT_NAMES = [
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

export const SHAPE_CONFIG: Record<
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

export function createStats(): StatBlock {
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

export function moveSpeed(tank: TankState) {
  let speed = 238 + tank.stats.moveSpeed * 19 - tank.level * 0.4
  if (hasTalent(tank, 'flankGuard')) speed *= 1.04
  if (hasTalent(tank, 'destroyer')) speed *= 0.92
  return speed
}

export function bulletSpeed(tank: TankState) {
  let speed = 650 + tank.stats.bulletSpeed * 62
  if (hasTalent(tank, 'sniper')) speed *= 1.35
  if (hasTalent(tank, 'machineGun')) speed *= 0.95
  if (hasTalent(tank, 'trapper')) speed *= 0.55
  if (hasTalent(tank, 'destroyer')) speed *= 0.85
  return speed
}

export function bulletDamage(tank: TankState) {
  let damage = 16 + tank.stats.bulletDamage * 5.5 + tank.level * 0.26
  if (hasTalent(tank, 'twin')) damage *= 0.82
  if (hasTalent(tank, 'sniper')) damage *= 1.15
  if (hasTalent(tank, 'machineGun')) damage *= 0.78
  if (hasTalent(tank, 'trapper')) damage *= 0.72
  if (hasTalent(tank, 'destroyer')) damage *= 2.15
  return damage
}

export function reloadTime(tank: TankState) {
  let reload = 0.46 - tank.stats.reload * 0.044
  if (hasTalent(tank, 'twin')) reload *= 1.08
  if (hasTalent(tank, 'sniper')) reload *= 1.14
  if (hasTalent(tank, 'machineGun')) reload *= 0.62
  if (hasTalent(tank, 'trapper')) reload *= 1.22
  if (hasTalent(tank, 'destroyer')) reload *= 1.9
  return Math.max(0.1, reload)
}

export function bodyDamage(tank: TankState) {
  return 14 + tank.stats.bodyDamage * 5
}

export function regenRate(tank: TankState) {
  return 5 + tank.stats.regen * 2.8
}

export function xpForNext(level: number) {
  return Math.floor(44 + level * 18 + Math.pow(level, 1.55) * 8)
}

export function random(min: number, max: number) {
  return min + Math.random() * (max - min)
}

export function randomInt(min: number, max: number) {
  return Math.floor(random(min, max + 1))
}

export function pick<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)]
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function length(point: Point) {
  return Math.hypot(point.x, point.y)
}

export function normalize(point: Point): Point {
  const magnitude = length(point)
  if (magnitude <= 0.0001) {
    return { x: 0, y: 0 }
  }
  return { x: point.x / magnitude, y: point.y / magnitude }
}

export function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function distanceSq(a: Point, b: Point) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

export function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t
}

export function lerpAngle(from: number, to: number, t: number) {
  return from + angleDelta(from, to) * t
}

export function angleDelta(from: number, to: number) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from))
}

export function lighten(hex: string, amount: number) {
  const value = Number.parseInt(hex.slice(1), 16)
  const r = clamp(((value >> 16) & 255) + 255 * amount, 0, 255)
  const g = clamp(((value >> 8) & 255) + 255 * amount, 0, 255)
  const b = clamp((value & 255) + 255 * amount, 0, 255)
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
}
