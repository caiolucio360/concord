/**
 * Faixas de nível: a cada 10 níveis muda a cor (e a animação de subir fica
 * mais intensa). Do 100 em diante é "Lendário", com gradiente animado.
 */
export interface LevelTier {
  name: string
  /** Cor principal (badge, halo, faíscas). */
  color: string
  /** Segunda cor do gradiente do badge. */
  accent: string
}

const TIERS: LevelTier[] = [
  { name: 'Bronze', color: '#cd7f32', accent: '#8a4b16' },
  { name: 'Prata', color: '#c9d1dc', accent: '#7d8896' },
  { name: 'Ouro', color: '#f5c542', accent: '#b8860b' },
  { name: 'Esmeralda', color: '#34d399', accent: '#047857' },
  { name: 'Safira', color: '#60a5fa', accent: '#1d4ed8' },
  { name: 'Ametista', color: '#c084fc', accent: '#7e22ce' },
  { name: 'Rubi', color: '#f87171', accent: '#b91c1c' },
  { name: 'Diamante', color: '#67e8f9', accent: '#0e7490' },
  { name: 'Obsidiana', color: '#a5b4fc', accent: '#312e81' },
  { name: 'Celestial', color: '#fde68a', accent: '#db2777' }
]

export const LEGENDARY_TIER: LevelTier = { name: 'Lendário', color: '#ffffff', accent: '#f472b6' }

export function levelTier(level: number): LevelTier {
  if (level >= 100) return LEGENDARY_TIER
  return TIERS[Math.max(0, Math.floor(level / 10))] ?? TIERS[0]
}
