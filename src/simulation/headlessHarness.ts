import { LocalTankSimulation } from './localSimulation'
import { MODE_DEFINITIONS } from './modes'
import type { ClientInput, MatchMode } from './protocol'

export type HeadlessSimulationResult = {
  before: ReturnType<LocalTankSimulation['getDebugState']>
  after: ReturnType<LocalTankSimulation['getDebugState']>
  snapshotCounts: {
    tanks: number
    bullets: number
    shapes: number
    events: number
  }
  talentCheck: {
    selected: boolean
    bulletsAfterTwinShot: number
  }
  modeChecks: {
    mode: MatchMode
    tanks: number
    shapes: number
    controlPoints: number
    playerIsBot: boolean
  }[]
}

export function runHeadlessSimulation(frames = 360): HeadlessSimulationResult {
  const simulation = new LocalTankSimulation(false)
  const before = simulation.getDebugState()
  const input: ClientInput = {
    movement: { x: 0, y: -1 },
    aimAngle: -Math.PI / 2,
    fire: true,
    autoFire: false,
  }

  let time = 0
  for (let frame = 0; frame < frames; frame += 1) {
    time += 1000 / 60
    simulation.update(1 / 60, time, input)
  }

  const after = simulation.getDebugState()
  const snapshot = simulation.getSnapshot()
  const talentSimulation = new LocalTankSimulation('freeForAll')
  talentSimulation.player.level = 5
  talentSimulation.player.talentPoints = 1
  talentSimulation.update(1 / 60, 1000 / 60, {
    movement: { x: 0, y: 0 },
    aimAngle: 0,
    fire: true,
    autoFire: false,
    selectedTalent: 'twin',
  })

  return {
    before,
    after,
    snapshotCounts: {
      tanks: snapshot.tanks.length,
      bullets: snapshot.bullets.length,
      shapes: snapshot.shapes.length,
      events: snapshot.events.length,
    },
    talentCheck: {
      selected: talentSimulation.player.talents.includes('twin'),
      bulletsAfterTwinShot: talentSimulation.bullets.filter((bullet) => bullet.ownerId === talentSimulation.player.id)
        .length,
    },
    modeChecks: MODE_DEFINITIONS.map((mode) => {
      const modeSimulation = new LocalTankSimulation(mode.id)
      modeSimulation.update(1 / 60, 1000 / 60, {
        movement: { x: 0, y: 0 },
        aimAngle: 0,
        fire: false,
        autoFire: false,
      })
      const modeSnapshot = modeSimulation.getSnapshot()
      return {
        mode: mode.id,
        tanks: modeSnapshot.tanks.length,
        shapes: modeSnapshot.shapes.length,
        controlPoints: modeSnapshot.controlPoints.length,
        playerIsBot: modeSnapshot.tanks.find((tank) => tank.id === modeSnapshot.playerId)?.bot ?? false,
      }
    }),
  }
}
