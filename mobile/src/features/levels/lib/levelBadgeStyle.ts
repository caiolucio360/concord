import { LEGENDARY_TIER, levelTier } from './levels'

/**
 * Visual do selo "Nv N" (porte do levelBadgeStyle do desktop). Quase todo nível usa o degradê da faixa
 * (Bronze, Prata...); 13, 14, 22 e 24 têm selo próprio, decidido pelo dono. No app o degradê vai em
 * `colors` (ou faixas duras no orgulho); as estampas (estrelinhas do 13, rosetas do 14, losango do 22) e
 * o cintilar ficam para um lote de animação.
 */
export type LevelBadgeVariant = 'faixa' | 'lendario' | 'estrelas' | 'onca' | 'brasil' | 'orgulho'

export interface LevelBadgeLook {
  variant: LevelBadgeVariant
  /** Cores do degradê do fundo, na diagonal (135 graus). */
  colors: string[]
  /** Faixas duras (orgulho): cada cor ocupa 1/n do fundo, de cima para baixo. */
  stripes: boolean
  text: string
  /** Contorno do texto (selos especiais). */
  halo?: string
  /** O "Nv" fica mais apagado que o número (só no selo comum). */
  dimLabel: boolean
}

/** As 6 faixas da bandeira do orgulho, de cima para baixo. */
export const PRIDE_COLORS = ['#e40303', '#ff8c00', '#ffed00', '#008026', '#004dff', '#750787']

const SPECIAL: Record<number, Omit<LevelBadgeLook, 'dimLabel'>> = {
  13: { variant: 'estrelas', colors: ['#c81e1e', '#8f1414'], stripes: false, text: '#ffffff', halo: '#5c0d0d' },
  14: { variant: 'onca', colors: ['#f0b54a', '#c98420'], stripes: false, text: '#1c1206', halo: '#f6c768' },
  22: { variant: 'brasil', colors: ['#006b33', '#004d24'], stripes: false, text: '#ffdf00', halo: '#00230f' },
  24: { variant: 'orgulho', colors: PRIDE_COLORS, stripes: true, text: '#ffffff', halo: '#1a1022' }
}

/** Níveis com selo próprio (em ordem). */
export const SPECIAL_BADGE_LEVELS: readonly number[] = Object.keys(SPECIAL).map(Number)

export function levelBadgeStyle(level: number): LevelBadgeLook {
  const special = SPECIAL[level]
  if (special) return { ...special, dimLabel: false }
  const tier = levelTier(level)
  if (tier === LEGENDARY_TIER) {
    return { variant: 'lendario', colors: [tier.color, tier.accent], stripes: false, text: '#1a1022', dimLabel: true }
  }
  return { variant: 'faixa', colors: [tier.color, tier.accent], stripes: false, text: '#0b0b0f', dimLabel: true }
}
