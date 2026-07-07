import { chromium } from 'playwright'

const url = process.env.SMOKE_URL ?? 'http://127.0.0.1:5173'
const executablePath =
  process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

const browser = await chromium.launch({
  executablePath,
  headless: true,
})

try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text())
    }
  })

  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Deploy' }).click()
  await page.waitForTimeout(350)
  const menuHiddenAfterDeploy = await page.evaluate(
    () => document.querySelector('#menu')?.classList.contains('is-hidden') ?? false,
  )
  if (!menuHiddenAfterDeploy) {
    throw new Error('Deploy did not hide the menu')
  }
  const beforeMove = await page.evaluate(() => window.__MOO_TANKS_GAME__.getDebugState())
  await page.keyboard.down('w')
  await page.waitForTimeout(450)
  await page.keyboard.up('w')
  const afterMove = await page.evaluate(() => window.__MOO_TANKS_GAME__.getDebugState())
  if (afterMove.playerY >= beforeMove.playerY - 12) {
    throw new Error(
      `WASD movement failed: Y stayed near ${beforeMove.playerY.toFixed(1)} -> ${afterMove.playerY.toFixed(1)}`,
    )
  }
  await page.waitForTimeout(1500)

  const state = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    if (!(canvas instanceof HTMLCanvasElement)) {
      return { ok: false, reason: 'missing canvas' }
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return { ok: false, reason: 'missing canvas context' }
    }

    const points = [
      [Math.floor(canvas.width * 0.5), Math.floor(canvas.height * 0.5)],
      [Math.floor(canvas.width * 0.25), Math.floor(canvas.height * 0.3)],
      [Math.floor(canvas.width * 0.7), Math.floor(canvas.height * 0.55)],
      [Math.floor(canvas.width * 0.45), Math.floor(canvas.height * 0.8)],
    ]
    const samples = points.map(([x, y]) => Array.from(ctx.getImageData(x, y, 1, 1).data))
    const uniqueColors = new Set(samples.map((sample) => sample.join(','))).size

    return {
      ok: true,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      cssWidth: canvas.clientWidth,
      cssHeight: canvas.clientHeight,
      uniqueColors,
      menuHidden: document.querySelector('#menu')?.classList.contains('is-hidden') ?? false,
      menuTitle: document.querySelector('#menuTitle')?.textContent ?? '',
      leaderboardItems: document.querySelectorAll('#leaderboardList li').length,
      upgradeButtons: document.querySelectorAll('#upgradePanel button').length,
      talentButtons: document.querySelectorAll('#talentPanel button').length,
      modeButtons: document.querySelectorAll('#modeGrid button').length,
      levelText: document.querySelector('#playerLevel')?.textContent ?? '',
    }
  })

  if (!state.ok) {
    throw new Error(state.reason)
  }
  if (state.canvasWidth < 600 || state.canvasHeight < 400) {
    throw new Error(`Canvas is too small: ${state.canvasWidth}x${state.canvasHeight}`)
  }
  if (state.uniqueColors < 2) {
    throw new Error('Canvas render appears blank or flat')
  }
  if (!state.menuHidden) {
    throw new Error(`Menu became visible during smoke run: ${state.menuTitle}`)
  }
  if (state.leaderboardItems < 5) {
    throw new Error(`Expected bot leaderboard entries, found ${state.leaderboardItems}`)
  }
  if (state.upgradeButtons !== 7) {
    throw new Error(`Expected 7 upgrade buttons, found ${state.upgradeButtons}`)
  }
  if (state.talentButtons !== 7) {
    throw new Error(`Expected 7 talent buttons, found ${state.talentButtons}`)
  }
  if (state.modeButtons !== 6) {
    throw new Error(`Expected 6 mode buttons, found ${state.modeButtons}`)
  }
  if (errors.length > 0) {
    throw new Error(`Browser console errors: ${errors.join(' | ')}`)
  }

  const perf = await page.evaluate(() => window.__MOO_TANKS_GAME__.benchmark(360))
  if (perf.fps < 200) {
    throw new Error(`Raw frame benchmark too slow: ${perf.fps} FPS`)
  }

  console.log(JSON.stringify({ ...state, beforeMove, afterMove, perf }, null, 2))
} finally {
  await browser.close()
}
