import type { TalentBranch, TalentId, TankState } from './protocol'

export type TalentDefinition = {
  id: TalentId
  branch: TalentBranch
  label: string
  shortLabel: string
  minLevel: number
  description: string
}

export const TALENTS: TalentDefinition[] = [
  {
    id: 'twin',
    branch: 'Twin',
    label: 'Twin Barrels',
    shortLabel: 'Twin',
    minLevel: 5,
    description: 'Fires a paired barrel pattern with lower per-shot damage.',
  },
  {
    id: 'sniper',
    branch: 'Sniper',
    label: 'Sniper Optics',
    shortLabel: 'Sniper',
    minLevel: 5,
    description: 'Longer range, faster bullets, and higher damage with slower reload.',
  },
  {
    id: 'machineGun',
    branch: 'Machine Gun',
    label: 'Machine Gun',
    shortLabel: 'MG',
    minLevel: 5,
    description: 'Much faster reload with lighter, less accurate bullets.',
  },
  {
    id: 'flankGuard',
    branch: 'Flank Guard',
    label: 'Flank Guard',
    shortLabel: 'Flank',
    minLevel: 10,
    description: 'Adds a rear guard barrel for pressure while retreating.',
  },
  {
    id: 'drone',
    branch: 'Drone',
    label: 'Drone Pods',
    shortLabel: 'Drone',
    minLevel: 10,
    description: 'Launches small side pods with long life alongside normal shots.',
  },
  {
    id: 'trapper',
    branch: 'Trapper',
    label: 'Trapper Rounds',
    shortLabel: 'Trap',
    minLevel: 15,
    description: 'Slow, heavy rounds that stay active longer and hold space.',
  },
  {
    id: 'destroyer',
    branch: 'Destroyer',
    label: 'Destroyer Cannon',
    shortLabel: 'Destroy',
    minLevel: 15,
    description: 'Big cannon rounds with heavy damage, recoil, and reload cost.',
  },
]

export const TALENT_LABELS = Object.fromEntries(TALENTS.map((talent) => [talent.id, talent.label])) as Record<
  TalentId,
  string
>

export function hasTalent(tank: TankState, talentId: TalentId) {
  return tank.talents.includes(talentId)
}

export function findTalent(talentId: TalentId) {
  return TALENTS.find((talent) => talent.id === talentId)
}

export function canSelectTalent(tank: TankState, talentId: TalentId) {
  const talent = findTalent(talentId)
  if (!talent) return false
  return tank.talentPoints > 0 && tank.level >= talent.minLevel && !hasTalent(tank, talentId)
}
