import type { BadgeStreak } from '../api/badges'

function dias(n: number, um: string, varios: string): string {
  return `${n.toLocaleString('pt-BR')} ${n === 1 ? um : varios}`
}

export interface StreakLines {
  main: string
  /** Só no próprio perfil. */
  record: string | null
  /** Só no próprio perfil, com a sequência viva e hoje ainda sem contar. */
  warning: string | null
}

/** Textos da sequência atual no badge Sequência; null se o servidor não mandou. */
export function streakLines(streak: BadgeStreak | undefined, isMe: boolean): StreakLines | null {
  if (!streak) return null
  const main =
    streak.current > 0
      ? dias(streak.current, 'dia seguido', 'dias seguidos')
      : 'Sem sequência no momento'
  if (!isMe) return { main, record: null, warning: null }
  return {
    main,
    record: `Recorde: ${dias(streak.longest ?? 0, 'dia', 'dias')}`,
    warning: streak.at_risk ? 'Use o Salinha hoje para manter a sequência' : null
  }
}

/** Linha extra do tooltip do badge Sequência na fileira do perfil. */
export function streakTooltip(streak: BadgeStreak | undefined): string | null {
  if (!streak || streak.current <= 0) return null
  return dias(streak.current, 'dia seguido', 'dias seguidos')
}
