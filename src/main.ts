import './style.css'
import { TankArena } from './tankArena'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main class="game-shell">
    <canvas id="arena" aria-label="Moo Tanks arena" tabindex="0"></canvas>

    <section class="hud hud-primary" aria-label="Player status">
      <div class="hud-row hud-title">
        <span id="playerName">Moo</span>
        <strong id="playerLevel">Level 1</strong>
      </div>
      <div class="meter health-meter"><span id="healthFill"></span></div>
      <div class="meter xp-meter"><span id="xpFill"></span></div>
      <div class="hud-row">
        <span>Score</span>
        <strong id="scoreValue">0</strong>
      </div>
      <div class="hud-row">
        <span>Best</span>
        <strong id="bestValue">0</strong>
      </div>
    </section>

    <section class="hud leaderboard" aria-label="Leaderboard">
      <h2>Leaderboard</h2>
      <ol id="leaderboardList"></ol>
    </section>

    <section class="upgrade-panel" id="upgradePanel" aria-label="Upgrades"></section>
    <section class="talent-panel" id="talentPanel" aria-label="Talents"></section>

    <section class="menu" id="menu" aria-label="Game menu">
      <div class="menu-panel">
        <p class="kicker">Moo Tanks</p>
        <h1 id="menuTitle">Arena Online</h1>
        <p id="menuStats" class="menu-stats">0 bots active</p>
        <div class="mode-grid" id="modeGrid" aria-label="Mode select">
          <button type="button" data-mode="freeForAll" class="is-selected">FFA</button>
          <button type="button" data-mode="teamDeathmatch">TDM</button>
          <button type="button" data-mode="domination">Domination</button>
          <button type="button" data-mode="survival">Survival</button>
          <button type="button" data-mode="maze">Maze</button>
          <button type="button" data-mode="privateLobby">Private</button>
        </div>
        <div class="menu-actions">
          <button id="startButton" type="button">Deploy</button>
          <button id="botButton" type="button" class="secondary">Bot Brawl</button>
        </div>
      </div>
      <footer class="kitsune-footer">Made by Kitsune Technologies</footer>
    </section>
  </main>
`

const game = new TankArena({
  canvas: document.querySelector<HTMLCanvasElement>('#arena')!,
  menu: document.querySelector<HTMLElement>('#menu')!,
  menuTitle: document.querySelector<HTMLElement>('#menuTitle')!,
  menuStats: document.querySelector<HTMLElement>('#menuStats')!,
  modeGrid: document.querySelector<HTMLElement>('#modeGrid')!,
  startButton: document.querySelector<HTMLButtonElement>('#startButton')!,
  botButton: document.querySelector<HTMLButtonElement>('#botButton')!,
  playerName: document.querySelector<HTMLElement>('#playerName')!,
  playerLevel: document.querySelector<HTMLElement>('#playerLevel')!,
  healthFill: document.querySelector<HTMLElement>('#healthFill')!,
  xpFill: document.querySelector<HTMLElement>('#xpFill')!,
  scoreValue: document.querySelector<HTMLElement>('#scoreValue')!,
  bestValue: document.querySelector<HTMLElement>('#bestValue')!,
  leaderboardList: document.querySelector<HTMLOListElement>('#leaderboardList')!,
  upgradePanel: document.querySelector<HTMLElement>('#upgradePanel')!,
  talentPanel: document.querySelector<HTMLElement>('#talentPanel')!,
})

;(globalThis as unknown as { __MOO_TANKS_GAME__?: TankArena }).__MOO_TANKS_GAME__ = game
game.start()
