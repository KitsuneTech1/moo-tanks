import { createServer } from 'vite'

const server = await createServer({
  appType: 'custom',
  logLevel: 'error',
  server: { middlewareMode: true },
})

try {
  const { runHeadlessSimulation } = await server.ssrLoadModule('/src/simulation/headlessHarness.ts')
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
