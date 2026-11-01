<p align="center"><a href="https://kitsunetechnologies.org/work"><img src="https://raw.githubusercontent.com/KitsuneTech1/.github/main/assets/kitsune-banner.svg" alt="Built by Kitsune Technologies" width="760"></a></p>

# Tank Yard

A Diep-style browser tank arena prototype with working bots, upgrades, and shape farming.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

## Play online

Runs entirely in the browser, no account or install needed. Play it right now: **[kitsunetechnologies.org/play/tank-yard](https://kitsunetechnologies.org/play/tank-yard/)**

Click Bot Brawl on the menu for an instant match against bots.

![Tank Yard gameplay](docs-assets/screenshot.png)

## Features

- Player tank with mouse aim, movement, shooting, health, XP, score, and upgrade points.
- Shape farming: squares, triangles, and pentagons to grind for XP.
- Bots that roam, target shapes and other tanks, shoot, strafe, level up, and respawn.
- Leaderboard, minimap, health/XP bars, high score persistence, and pause/restart.
- Local modes: Free For All, Team Deathmatch, Domination, Survival, Maze Arena, Bot Brawl, and Private Lobby.
- Talent branches at level milestones: Twin, Sniper, Machine Gun, Flank Guard, Drone, Trapper, and Destroyer.
- A DOM-free simulation core (`src/simulation`) shared between the browser client and headless tests.
- A separate SpacetimeDB backend scaffold (`backend/spacetimedb`) for a future multiplayer prototype. Not required to play; the current build is fully client-side.

## Quick Start

To run the code locally (to modify the game or work on the backend), you need Node.js 20.19+ or 22.12+.


1. **Open a terminal.**
   - Windows: press the Start key, type `PowerShell`, and open "Windows PowerShell".
   - Mac: open Spotlight (Cmd+Space), type `Terminal`, and open it.

2. **Get the code.** Pick one:
   - No `git` installed: on the [GitHub page](https://github.com/KitsuneTech1/moo-tanks), click the green "Code" button, choose "Download ZIP", then extract the ZIP somewhere easy to find, like your Desktop.
   - With `git` installed:
     ```bash
     git clone https://github.com/KitsuneTech1/moo-tanks.git
     ```

3. **Move into the project folder.**
   ```bash
   cd moo-tanks
   ```
   (If you downloaded the ZIP to your Desktop instead, use `cd Desktop/moo-tanks` or wherever you extracted it.)

4. **Install dependencies.**
   ```bash
   npm install
   ```
   This downloads everything the project needs. It can take a minute or two the first time.

5. **Start the dev server.**
   ```bash
   npm run dev
   ```
   You should see output that includes a line like `Local: http://localhost:5173/moo-tanks/`.

6. **Open the game.** Go to `http://localhost:5173/moo-tanks/` in your browser (Ctrl+click or Cmd+click the link in the terminal also works).

**It worked if:** you see the Tank Yard menu, and clicking Bot Brawl drops you into an arena you can move around in with WASD.

**Troubleshooting:**

- **Port 5173 already in use.** Vite picks the next free port automatically and prints the new address in the terminal, use that URL instead. Or close whatever else is already running on that port.
- **`'npm' is not recognized` / `npm: command not found`.** Node.js isn't installed, or you opened the terminal before installing it. Install Node from https://nodejs.org, then close and reopen your terminal.
- **Blank white page in the browser.** Hard refresh with Ctrl+Shift+R (Cmd+Shift+R on Mac). If it's still blank, press F12 to open the browser console and check for a red error message, then confirm `npm install` finished without errors.
- **Game feels choppy.** Close other heavy tabs or programs. This is a prototype, so performance can vary by browser and machine.

### Other useful commands

```bash
npm run build          # build the static site
npm run typecheck      # tsc
npm run smoke          # browser smoke test (needs a running dev/preview server)
npm run sim:smoke      # headless simulation smoke test
npm run backend:check  # cargo check on the backend scaffold
```

## Controls

| Action | Input |
| --- | --- |
| Move | `WASD` or arrow keys |
| Aim | Mouse |
| Fire | Hold left mouse button |
| Toggle auto-fire | `E` |
| Upgrade a stat | Click an upgrade panel button, or number keys |
| Pick a talent | Click an unlocked talent button |
| Pause | `P` |
| Restart after death | `R` |

## Roadmap

This is a prototype, not a finished game. Current state and honest next steps:

- Done: playable single-player arena with bots, upgrades, talents, and local game modes.
- In progress: a dedicated SpacetimeDB backend for real multiplayer (schema and reducers exist, no live server yet).
- Planned: client prediction and snapshot interpolation once the backend is live, then account login, cosmetics, and a native Flutter client.

See `notes/ROADMAP.md` and `notes/DEVLOG.md` for details.

## License

MIT. Copyright (c) 2026 Kitsune Technologies LLC. Do what you like with it, commercially or otherwise, just keep the copyright notice. Full text in [LICENSE](LICENSE).

---

<p align="center"><sub>Part of <b>Buildtober 2026</b>: 31 open source projects in 31 days. Built by <a href="https://kitsunetechnologies.org/work">Kitsune Technologies</a>. More at <a href="https://github.com/KitsuneTech1">github.com/KitsuneTech1</a>.</sub></p>
