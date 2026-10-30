import { useCallback, useEffect, useRef, useState } from 'react'
import {
  nextPreviewMode,
  opensOnHover,
  PREVIEW_HOVER_CLOSE_MS,
  PREVIEW_HOVER_OPEN_MS,
  type PreviewEvent,
  type PreviewMode
} from '../lib/liveBadgePreview'

interface HoverHandlers {
  onPointerEnter: (e: React.PointerEvent) => void
  onPointerLeave: (e: React.PointerEvent) => void
}

/**
 * Abre e fecha a prévia do selo LIVE: mouse em cima (com um instante de
 * espera), toque/clique fixa; Esc, clique fora, rolar ou redimensionar fecham.
 */
export function useLiveBadgePreview(): {
  mode: PreviewMode
  badgeRef: React.RefObject<HTMLButtonElement | null>
  cardRef: React.RefObject<HTMLDivElement | null>
  hover: HoverHandlers
  tap: () => void
  dismiss: () => void
} {
  const [mode, setMode] = useState<PreviewMode>('closed')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const badgeRef = useRef<HTMLButtonElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)

  const send = useCallback((event: PreviewEvent, delay = 0): void => {
    clearTimeout(timer.current)
    const apply = (): void => setMode((m) => nextPreviewMode(m, event))
    if (delay > 0) timer.current = setTimeout(apply, delay)
    else apply()
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  useEffect(() => {
    if (mode === 'closed') return
    const close = (): void => send('dismiss')
    const onDown = (e: PointerEvent): void => {
      const node = e.target as Node
      if (badgeRef.current?.contains(node) || cardRef.current?.contains(node)) return
      close()
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [mode, send])

  const hover: HoverHandlers = {
    onPointerEnter: (e) => {
      if (opensOnHover(e.pointerType)) send('hover', mode === 'closed' ? PREVIEW_HOVER_OPEN_MS : 0)
    },
    onPointerLeave: (e) => {
      if (opensOnHover(e.pointerType)) send('unhover', PREVIEW_HOVER_CLOSE_MS)
    }
  }

  const tap = useCallback(() => send('tap'), [send])
  const dismiss = useCallback(() => send('dismiss'), [send])
  return { mode, badgeRef, cardRef, hover, tap, dismiss }
}
