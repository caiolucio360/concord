// Textos e brilho da faixa de "subiu de nível" (LevelUpBanner).
import type { LevelUpEffects } from './levels'

export interface BannerCelebration {
  level: number
  /** A celebração é sua. */
  own: boolean
  /** Nome de quem é, quando é a de outra pessoa. */
  name?: string
}

/** Título da faixa: a sua subida ou a de outra pessoa, com ou sem marco. */
export function levelUpHeadline(
  celebration: BannerCelebration,
  milestone: LevelUpEffects['milestone']
): string {
  if (celebration.own) {
    return milestone ? `Marco ${milestone.level} alcançado!` : 'Você subiu de nível!'
  }
  const who = celebration.name ?? 'Essa pessoa'
  return milestone
    ? `${who} chegou ao marco ${milestone.level}`
    : `${who} está no nível ${celebration.level}`
}

/** Brilho da faixa: maior e mais forte a cada nível. */
export function bannerShadow(fx: Pick<LevelUpEffects, 'glow' | 'tier'>): string {
  const glowPx = Math.round(18 + 42 * fx.glow)
  const glowAlpha = Math.round(0x40 + 0x80 * Math.min(1, fx.glow))
    .toString(16)
    .padStart(2, '0')
  return `0 0 ${glowPx}px ${fx.tier.color}${glowAlpha}`
}
