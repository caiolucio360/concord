import type { BadgeStreak as Streak } from '../api/badges'
import { streakLines } from '../lib/streak'
import { FlameIcon } from '../../../shared/ui/icons'

/**
 * Sequência atual no detalhe do badge Sequência: chama + dias seguidos e,
 * no próprio perfil, o recorde e o aviso quando hoje ainda não contou.
 */
function BadgeStreak({
  streak,
  isMe
}: {
  streak: Streak | undefined
  isMe: boolean
}): React.JSX.Element | null {
  const lines = streakLines(streak, isMe)
  if (!lines) return null
  const alive = (streak?.current ?? 0) > 0

  return (
    <>
      <div className="flex items-center gap-3">
        <FlameIcon
          size={24}
          className={alive ? 'shrink-0 text-warning' : 'shrink-0 text-faint'}
        />
        <div className="min-w-0">
          <p className="text-ds-sm font-semibold text-strong">{lines.main}</p>
          {lines.record && <p className="text-ds-xs text-muted">{lines.record}</p>}
        </div>
      </div>
      {lines.warning && (
        <p className="mt-2 text-ds-xs font-medium text-warning" role="status">
          {lines.warning}
        </p>
      )}
      <div className="my-4 h-px bg-fg/10" />
    </>
  )
}

export default BadgeStreak
