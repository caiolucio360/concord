import { useId, useState } from 'react'
import type { Badge } from '../api/badges'
import type { BadgesModalTarget } from '../store/badgeStore'
import { useAuthStore } from '../../auth/store/authStore'
import { useBadgeStore } from '../store/badgeStore'
import {
  formatUnlockDate,
  isMythic,
  rarityMeta,
  selectedBadge,
  publicStatText,
  statText,
  visibleBadges
} from '../lib/badges'
import Modal from '../../../shared/ui/Modal'
import { ChevronUpIcon, SparkleIcon } from '../../../shared/ui/icons'
import BadgeIcon from './BadgeIcon'
import BadgesAside from './BadgesAside'
import BadgeProgress from './BadgeProgress'
import BadgeTierLadder from './BadgeTierLadder'
import { BadgeDetailSkeleton } from '../../../shared/ui/skeleton/layouts'

function RarityChip({ badge }: { badge: Badge }): React.JSX.Element {
  const meta = rarityMeta(badge.rarity)
  if (isMythic(badge.rarity)) {
    return (
      <span className="mythic-chip inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black uppercase tracking-wide">
        <SparkleIcon size={12} />
        {meta.label}
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
      style={{
        color: meta.color,
        background: meta.bg,
        boxShadow: `inset 0 0 0 1px ${meta.color}55`
      }}
    >
      <ChevronUpIcon size={12} />
      {meta.label}
    </span>
  )
}

function Detail({
  badge,
  isMe,
  ownerName
}: {
  badge: Badge
  isMe: boolean
  ownerName: string
}): React.JSX.Element {
  const meta = rarityMeta(badge.rarity)
  const title = badge.tier_name
  const unlocked = formatUnlockDate(badge.unlocked_at)
  // O mítico tem a própria aura (MythicIcon); os outros, um brilho na cor.
  const mythic = isMythic(badge.rarity)

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex h-44 w-44 items-center justify-center">
        {!mythic && (
          <span
            aria-hidden="true"
            className="absolute inset-4 rounded-full blur-2xl"
            style={{ background: `${meta.color}33` }}
          />
        )}
        <BadgeIcon
          category={badge.category}
          tier={badge.tier}
          rarity={badge.rarity}
          size={168}
          hero
          className="relative drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
        />
      </div>

      {title !== badge.name && <p className="mt-2 text-sm text-gray-300">{badge.name}</p>}
      <h3
        className={`${title !== badge.name ? 'mt-0.5' : 'mt-2'} text-center text-3xl font-black uppercase tracking-wide ${
          mythic ? 'mythic-text' : 'text-strong'
        }`}
      >
        {title}
      </h3>
      <p className="mt-1.5 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-center text-xs text-gray-400">
        {/* Perfil de outra pessoa: só o limite do tier, nunca o número exato. */}
        <span>{isMe ? statText(badge) : publicStatText(badge)}</span>
        {unlocked && (
          <>
            <span aria-hidden="true">·</span>
            <span>Desbloqueado em {unlocked}</span>
          </>
        )}
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span aria-hidden="true">·</span>
          <RarityChip badge={badge} />
        </span>
      </p>

      <div className="mt-5 w-full rounded-xl bg-input p-4">
        {isMe && <BadgeProgress badge={badge} mythic={mythic} />}

        <p className="text-sm leading-snug text-gray-200">{badge.description}</p>

        <div className="my-4 h-px bg-fg/10" />
        <p className="text-sm font-semibold text-strong">
          {isMe ? 'Tiers' : `Progresso de ${ownerName}`}
        </p>
        <BadgeTierLadder badge={badge} />
      </div>
    </div>
  )
}

/**
 * "Badges de Fulano" (como no Discord): grade à esquerda, o badge escolhido
 * à direita com arte grande, tier, estatística, raridade e a escada. Só
 * aparecem os badges já conquistados (o primeiro tier faz a categoria
 * surgir); no seu próprio perfil, também a barra de progresso até o próximo
 * tier. Os que faltam entram só como "N badges ocultos restantes".
 */
function BadgesModal(): React.JSX.Element | null {
  const target = useBadgeStore((s) => s.modal)
  const close = useBadgeStore((s) => s.closeModal)
  const openModal = useBadgeStore((s) => s.openModal)
  const me = useAuthStore((s) => s.user)
  const badges = useBadgeStore((s) => (target ? s.byUser[target.userId]?.badges : undefined))
  const hiddenRemaining = useBadgeStore((s) =>
    target ? s.byUser[target.userId]?.hiddenRemaining : undefined
  )
  // Escolha vale só para esta abertura do modal (target novo = escolha nova).
  const [picked, setPicked] = useState<{ target: BadgesModalTarget; category: string } | null>(null)
  const titleId = useId()

  if (!target) return null

  const isMe = target.userId === me?.id
  const earned = visibleBadges(badges)
  const selected = selectedBadge(earned, target, picked)
  const select = (category: string): void => setPicked({ target, category })

  const viewMine = (): void => {
    if (!me) return
    openModal({
      userId: me.id,
      name: me.display_name || me.username,
      avatarUrl: me.avatar_url
    })
  }

  // Foco preso, Esc e o X vêm do Modal (sem moldura: a coluna e o detalhe são o layout).
  return (
    <Modal open bare wide labelledBy={titleId} onClose={close}>
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden text-gray-200 md:h-[600px] md:flex-auto md:flex-row">
        <BadgesAside
          target={target}
          isMe={isMe}
          titleId={titleId}
          badges={badges}
          earned={earned}
          hiddenRemaining={hiddenRemaining}
          selected={selected}
          onSelect={select}
          canViewMine={Boolean(me)}
          onViewMine={viewMine}
        />

        <section className="relative min-h-0 min-w-0 flex-1 overflow-y-auto bg-primary p-6">
          {selected ? (
            <Detail badge={selected} isMe={isMe} ownerName={target.name} />
          ) : !badges ? (
            <BadgeDetailSkeleton />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              Nada por aqui ainda.
            </div>
          )}
        </section>
      </div>
    </Modal>
  )
}

export default BadgesModal
