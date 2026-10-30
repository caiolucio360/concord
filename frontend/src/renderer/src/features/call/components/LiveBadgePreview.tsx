import { useEffect, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { EyeIcon } from '../../../shared/ui/icons'
import { placeProfileCard } from '../../profile/lib/profileCard'
import { useServerStore } from '../../servers/store/serverStore'
import { useCallStore, type CallUserInfo } from '../store/callStore'
import { requestWatchStream } from '../store/streamJoinStore'
import { useLiveTarget } from '../hooks/useLiveTarget'
import { useLiveBadgePreview } from '../hooks/useLiveBadgePreview'
import { useScreenPreview } from '../hooks/useScreenPreview'
import { liveWatcherCount, placedCardStyle, watchersLabel } from '../lib/liveBadgePreview'
import type { LiveTarget } from '../lib/screenPreview'
import LiveBadge from './LiveBadge'
import LivePreviewFrame from './LivePreviewFrame'

type HoverProps = Partial<Pick<React.DOMAttributes<HTMLElement>, 'onPointerEnter' | 'onPointerLeave'>>

/** Clique dentro do cartão não abre o perfil de quem está na lista (o portal borbulha no React). */
const stop = (e: React.SyntheticEvent): void => e.stopPropagation()

/** O selo LIVE como botão: mouse em cima abre a prévia, clique/toque fixa. */
export function LiveBadgeButton({
  name,
  open,
  onTap,
  hover,
  badgeRef
}: {
  name: string
  open: boolean
  onTap: () => void
  hover: HoverProps
  badgeRef?: React.Ref<HTMLButtonElement>
}): React.JSX.Element {
  return (
    <button
      ref={badgeRef}
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onTap()
      }}
      {...hover}
      aria-label={`Prévia da transmissão de ${name}`}
      aria-haspopup="dialog"
      aria-expanded={open}
      // Área de toque maior que o selo (dedo no celular), sem mexer no layout.
      className="relative flex cursor-pointer rounded before:absolute before:-inset-x-1 before:-inset-y-2 before:content-[''] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
    >
      <LiveBadge />
    </button>
  )
}

/** Miniatura, quem transmite, quantos assistem e "Assistir". */
export function LivePreviewCardBody({
  name,
  src,
  ended,
  watchers,
  onWatch
}: {
  name: string
  src: string | null
  ended: boolean
  watchers: number
  onWatch: () => void
}): React.JSX.Element {
  return (
    <>
      <LivePreviewFrame src={src} ended={ended} name={name} />
      <div className="flex items-center gap-2 p-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-ds-sm font-semibold text-strong">{name}</p>
          <p className="flex items-center gap-1 text-ds-xs text-gray-400">
            <EyeIcon size={12} className="shrink-0" />
            {watchersLabel(watchers)}
          </p>
        </div>
        <button
          type="button"
          onClick={onWatch}
          disabled={ended}
          className="shrink-0 cursor-pointer rounded-md bg-success-strong px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-success-strong-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-default disabled:opacity-60"
        >
          Assistir
        </button>
      </div>
    </>
  )
}

/** Ao lado do selo (à direita; sem espaço, à esquerda), sempre dentro da janela. */
function useCardPosition(
  badgeRef: React.RefObject<HTMLElement | null>,
  cardRef: React.RefObject<HTMLElement | null>
): { left: number; top: number } | null {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  useLayoutEffect(() => {
    const badge = badgeRef.current
    const card = cardRef.current
    if (!badge || !card) return
    const { width, height } = card.getBoundingClientRect()
    setPos(
      placeProfileCard(
        badge.getBoundingClientRect(),
        'right',
        { width, height },
        { width: window.innerWidth, height: window.innerHeight }
      )
    )
  }, [badgeRef, cardRef])
  return pos
}

const NO_WATCHERS: CallUserInfo[] = []

interface CardProps {
  userId: string
  name: string
  channelId: string
  connectedHere: boolean
  target: LiveTarget
  preview: ReturnType<typeof useLiveBadgePreview>
}

/** O cartão flutuante: só existe aberto (e só então busca a foto). */
function LivePreviewCard({
  userId,
  name,
  channelId,
  connectedHere,
  target,
  preview
}: CardProps): React.JSX.Element {
  const { src, ended } = useScreenPreview(target.callId, userId)
  const entry = useCallStore((s) => s.serverCalls[channelId])
  const local = useCallStore((s) =>
    connectedHere ? (s.screenWatchers[userId] ?? NO_WATCHERS) : null
  )
  const channelName = useServerStore((s) => s.channels.find((c) => c.id === channelId)?.name)
  const pos = useCardPosition(preview.badgeRef, preview.cardRef)

  const watch = (): void => {
    preview.dismiss()
    requestWatchStream({ userId, name, target, channelName })
  }

  return createPortal(
    <div
      ref={preview.cardRef}
      role="dialog"
      aria-label={`Transmissão de ${name}`}
      onClick={stop}
      onContextMenu={stop}
      {...preview.hover}
      style={placedCardStyle(pos)}
      className="fixed z-50 w-72 max-w-[calc(100vw-1rem)] overflow-hidden rounded-lg border border-subtle bg-floating shadow-2xl"
    >
      <LivePreviewCardBody
        name={name}
        src={src}
        ended={ended}
        watchers={liveWatcherCount(userId, entry, local)}
        onWatch={watch}
      />
    </div>,
    document.body
  )
}

/**
 * Selo LIVE da lista do canal de voz com a prévia da live. Quem não pode
 * assistir (sala trancada, sem permissão, a própria live) vê só o selo.
 */
export default function LiveBadgeWithPreview({
  userId,
  name,
  channelId,
  connectedHere,
  canWatch
}: {
  userId: string
  name: string
  channelId: string
  connectedHere: boolean
  /** Posso ver e entrar neste canal de voz. */
  canWatch: boolean
}): React.JSX.Element {
  const target = useLiveTarget(userId, () => canWatch)
  const preview = useLiveBadgePreview()
  const watchable = target !== null
  const { dismiss } = preview
  // Deixou de dar para assistir com o cartão aberto: fecha (não reabre sozinho depois).
  useEffect(() => {
    if (!watchable) dismiss()
  }, [watchable, dismiss])
  if (!target) return <LiveBadge />
  return (
    <>
      <LiveBadgeButton
        name={name}
        open={preview.mode !== 'closed'}
        onTap={preview.tap}
        hover={preview.hover}
        badgeRef={preview.badgeRef}
      />
      {preview.mode !== 'closed' && (
        <LivePreviewCard
          userId={userId}
          name={name}
          channelId={channelId}
          connectedHere={connectedHere}
          target={target}
          preview={preview}
        />
      )}
    </>
  )
}
