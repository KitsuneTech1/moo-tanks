import assert from 'node:assert/strict'
import { createServer } from 'vite'

const server = await createServer({
  configFile: false,
  appType: 'custom',
  logLevel: 'error',
  server: { middlewareMode: true },
})

try {
  const { escapeHtml } = await server.ssrLoadModule('/src/tankArena.ts')
  const { readBestScore, writeBestScore } = await server.ssrLoadModule('/src/clientStorage.ts')
  const { LocalTankSimulation } = await server.ssrLoadModule('/src/simulation/localSimulation.ts')

  assert.equal(
    escapeHtml(`<img src=x onerror="alert(1)">&'`),
    '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;&#39;',
  )

  const malformedStorage = {
    getItem: () => 'not-a-score',
    setItem: () => {
      throw new Error('storage unavailable')
    },
  }
  assert.equal(readBestScore(malformedStorage), 0)
  assert.equal(readBestScore({ getItem: () => '123.9' }), 123)
  assert.doesNotThrow(() => writeBestScore(42, malformedStorage))

  const simulation = new LocalTankSimulation('privateLobby')
  const snapshot = simulation.getSnapshot()
  const snapshotBot = snapshot.tanks.find((tank) => tank.ai)
  const sourceBot = simulation.tanks.find((tank) => tank.id === snapshotBot?.id)
  assert.ok(snapshotBot?.ai && sourceBot?.ai)
  snapshotBot.ai.retargetIn = 999
  assert.notEqual(sourceBot.ai.retargetIn, 999)
  snapshot.world.width = 1
  assert.equal(simulation.getSnapshot().world.width, 4200)
} finally {
  await server.close()
}

console.log('unit-smoke: passed')
