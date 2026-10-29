import { BADGE_ART } from './badgeArtMap'

/**
 * Arte do badge (64 px): "<categoria>-<tier>". Tier 0 (ainda não conquistado) mostra a do primeiro tier.
 * Categoria sem arte (nova no backend, app antigo) devolve undefined e o BadgeIcon cai numa estrela.
 */
export function badgeArt(category: string, tier: number): number | undefined {
  return BADGE_ART[`${category}-${Math.max(1, tier)}`]
}
