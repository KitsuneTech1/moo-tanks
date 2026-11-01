import { createServer } from 'vite'

const server = await createServer({
  configFile: false,
  appType: 'custom',
  logLevel: 'error',
  server: { middlewareMode: true },
})

try {
  const { runHeadlessSimulation } = await server.ssrLoadModule('/src/simulation/headlessHarness.ts')
  const { LocalTankSimulation } = await server.ssrLoadModule('/src/simulation/localSimulation.ts')
  const result = runHeadlessSimulation(360)
  if (result.after.playerY >= result.before.playerY - 60) {
    throw new Error(
      `Headless movement failed: Y stayed near ${result.before.playerY.toFixed(1)} -> ${result.after.playerY.toFixed(1)}`,
    )
  }
  if (result.after.playerVelocity > 320) {
    throw new Error(`Velocity clamp failed: ${result.after.playerVelocity.toFixed(1)} is too high`)
  }
  if (result.snapshotCounts.tanks < 10) {
    throw new Error(`Expected bot tanks in snapshot, found ${result.snapshotCounts.tanks}`)
  }
  if (result.snapshotCounts.shapes < 70) {
    throw new Error(`Expected shape population in snapshot, found ${result.snapshotCounts.shapes}`)
  }
  if (!result.talentCheck.selected) {
    throw new Error('Twin talent was not selected in the headless simulation')
  }
  if (result.talentCheck.bulletsAfterTwinShot < 2) {
    throw new Error(`Twin talent did not fire a paired shot, bullets=${result.talentCheck.bulletsAfterTwinShot}`)
  }

  const duplicateDeathSimulation = new LocalTankSimulation('privateLobby')
  const victim = duplicateDeathSimulation.player
  const killer = duplicateDeathSimulation.tanks.find((tank) => tank.id !== victim.id)
  if (!killer) {
    throw new Error('Could not create a killer for duplicate-death regression test')
  }
  duplicateDeathSimulation.killTank(victim, killer)
  duplicateDeathSimulation.killTank(victim, killer)
  const destructionEvents = duplicateDeathSimulation
    .getSnapshot()
    .events.filter((event) => event.type === 'tankDestroyed' && event.victimId === victim.id)
  if (destructionEvents.length !== 1) {
    throw new Error(`Duplicate death handling emitted ${destructionEvents.length} destruction events`)
  }

  for (const mode of result.modeChecks) {
    if (mode.tanks < 6) {
      throw new Error(`Mode ${mode.mode} did not spawn enough tanks: ${mode.tanks}`)
    }
    if (mode.shapes < 60) {
      throw new Error(`Mode ${mode.mode} did not spawn enough shapes: ${mode.shapes}`)
    }
    if (mode.mode === 'domination' && mode.controlPoints !== 3) {
      throw new Error(`Domination should spawn 3 control points, found ${mode.controlPoints}`)
    }
    if (mode.mode === 'botBrawl' && !mode.playerIsBot) {
      throw new Error('Bot Brawl should put the camera player on AI control')
    }
  }

  console.log(JSON.stringify(result, null, 2))
} finally {
  await server.close()
}
