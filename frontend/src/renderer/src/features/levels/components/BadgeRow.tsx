import { useEffect, useState } from 'react'
import { useBadgeStore } from '../store/badgeStore'
import { profileBadgeRow } from '../lib/badges'
import BadgeRowItem from './BadgeRowItem'
import { BadgeRowSkeleton } from '../../../shared/ui/skeleton/layouts'

interface BadgeRowProps {
  userId: string
  name: string
  avatarUrl?: string | null
  /** Antes de abrir o modal (o cartão de perfil fecha). */
  onOpen?: () => void
  max?: number
}

/**
 * Fileira de badges ao lado do username, como no Discord: os mais raros
 * primeiro, até `max` ícones e "+N". Passar o mouse mostra o tier e a
 * categoria; clicar abre o modal de badges.
 */
function BadgeRow({
  userId,
  name,
  avatarUrl,
  onOpen,
  max = 6
}: BadgeRowProps): React.JSX.Element | null {
  const badges = useBadgeStore((s) => s.byUser[userId]?.badges)
  const streak = useBadgeStore((s) => s.byUser[userId]?.streak)
  const ensureBadges = useBadgeStore((s) => s.ensureBadges)
  const openModal = useBadgeStore((s) => s.openModal)

  // Quem já respondeu (mesmo com erro): o skeleton não fica para sempre se falhar.
  const [settled, setSettled] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void ensureBadges(userId).then(() => {
      if (!cancelled) setSettled(userId)
    })
    return () => {
      cancelled = true
    }
  }, [userId, ensureBadges])

  if (!badges) return settled === userId ? null : <BadgeRowSkeleton />
  const { shown, overflow } = profileBadgeRow(badges, max)
  if (shown.length === 0) return null

  const open = (category?: string): void => {
    onOpen?.()
    openModal({ userId, name, avatarUrl, category })
  }

  return (
    <div
      className="flex shrink-0 items-center gap-0.5 rounded-md border border-subtle bg-input px-1 py-0.5"
      aria-label="Badges"
    >
      {shown.map((b) => (
        <BadgeRowItem key={b.category} badge={b} streak={streak} onOpen={() => open(b.category)} />
      ))}
      {overflow > 0 && (
        <button
          type="button"
          onClick={() => open()}
          aria-label={`Ver mais ${overflow} badges`}
          className="cursor-pointer rounded px-1 text-[11px] font-semibold text-gray-300 transition-colors hover:bg-fg/10 hover:text-strong"
        >
          +{overflow}
        </button>
      )}
    </div>
  )
}

export default BadgeRow
