import type { Badge, BadgeStreak } from '../api/badges'
import { badgeLabel, isMythic, rarityMeta } from '../lib/badges'
import { streakTooltip } from '../lib/streak'
import BadgeIcon from './BadgeIcon'

/**
 * Um ícone da fileira de badges do perfil, com o tooltip (tier e categoria;
 * no Sequência, também os dias seguidos).
 */
function BadgeRowItem({
  badge: b,
  streak,
  onOpen
}: {
  badge: Badge
  streak?: BadgeStreak
  onOpen: () => void
}): React.JSX.Element {
  const dias = b.category === 'sequencia' ? streakTooltip(streak) : null
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={badgeLabel(b)}
      className="group relative flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded transition-transform hover:scale-110"
    >
      <BadgeIcon category={b.category} tier={b.tier} rarity={b.rarity} size={20} />
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-subtle bg-floating px-2 py-1 text-center shadow-xl group-hover:block group-focus-visible:block"
      >
        {isMythic(b.rarity) ? (
          <span className="mythic-text block text-xs font-black">{b.tier_name}</span>
        ) : (
          <span className="block text-xs font-bold" style={{ color: rarityMeta(b.rarity).color }}>
            {b.tier_name}
          </span>
        )}
        {b.tier_name !== b.name && (
          <span className="block text-[10px] text-gray-400">{b.name}</span>
        )}
        {dias && <span className="block text-[10px] text-warning">{dias}</span>}
      </span>
    </button>
  )
}

export default BadgeRowItem
