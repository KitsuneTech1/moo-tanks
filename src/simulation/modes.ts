import type { MatchMode } from './protocol'

export type ModeDefinition = {
  id: MatchMode
  label: string
  shortLabel: string
  botCount: number
  shapeTarget: number
  teams: boolean
  controlPoints: boolean
  survival: boolean
}

export const MODE_DEFINITIONS: ModeDefinition[] = [
  {
    id: 'freeForAll',
    label: 'Free For All',
    shortLabel: 'FFA',
    botCount: 15,
    shapeTarget: 82,
    teams: false,
    controlPoints: false,
    survival: false,
  },
  {
    id: 'teamDeathmatch',
    label: 'Team Deathmatch',
    shortLabel: 'TDM',
    botCount: 18,
    shapeTarget: 86,
    teams: true,
    controlPoints: false,
    survival: false,
  },
  {
    id: 'domination',
    label: 'Domination',
    shortLabel: 'Dom',
    botCount: 16,
    shapeTarget: 76,
    teams: true,
    controlPoints: true,
    survival: false,
  },
  {
    id: 'survival',
    label: 'Survival',
    shortLabel: 'Wave',
    botCount: 12,
    shapeTarget: 70,
    teams: true,
    controlPoints: false,
    survival: true,
  },
  {
    id: 'maze',
    label: 'Maze Arena',
    shortLabel: 'Maze',
    botCount: 12,
    shapeTarget: 124,
    teams: false,
    controlPoints: false,
    survival: false,
  },
  {
    id: 'botBrawl',
    label: 'Bot Brawl',
    shortLabel: 'Bots',
    botCount: 16,
    shapeTarget: 82,
    teams: false,
    controlPoints: false,
    survival: false,
  },
  {
    id: 'privateLobby',
    label: 'Private Lobby',
    shortLabel: 'Private',
    botCount: 5,
    shapeTarget: 64,
    teams: false,
    controlPoints: false,
    survival: false,
  },
]

export function modeDefinition(mode: MatchMode) {
  return MODE_DEFINITIONS.find((definition) => definition.id === mode) ?? MODE_DEFINITIONS[0]
}

export function modeFromLegacyWatchBots(watchBots: boolean): MatchMode {
  return watchBots ? 'botBrawl' : 'freeForAll'
}
