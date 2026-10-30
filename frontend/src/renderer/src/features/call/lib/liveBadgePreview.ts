import type { CallStateResponse } from '../api/calls'

// Prévia da live no selo LIVE da lista do canal de voz: passar o mouse abre um
// cartão com a foto da transmissão (a mesma do cartão de perfil), quem assiste
// e "Assistir". No toque (celular), tocar no selo abre e fixa. Puro.

/** Espera antes de abrir: passar o mouse de raspão pela lista não abre nada. */
export const PREVIEW_HOVER_OPEN_MS = 350
/** Folga para levar o mouse do selo até o cartão sem ele fechar. */
export const PREVIEW_HOVER_CLOSE_MS = 200

/** closed; hover = aberto enquanto o mouse está em cima; pinned = aberto por toque/clique. */
export type PreviewMode = 'closed' | 'hover' | 'pinned'
export type PreviewEvent = 'hover' | 'unhover' | 'tap' | 'dismiss'

export function nextPreviewMode(mode: PreviewMode, event: PreviewEvent): PreviewMode {
  switch (event) {
    case 'hover':
      return mode === 'closed' ? 'hover' : mode
    case 'unhover':
      return mode === 'hover' ? 'closed' : mode
    case 'tap':
      return mode === 'pinned' ? 'closed' : 'pinned'
    case 'dismiss':
      return 'closed'
  }
}

/** Só o mouse abre ao passar por cima; toque e caneta abrem tocando. */
export const opensOnHover = (pointerType: string): boolean => pointerType === 'mouse'

/**
 * Quantos assistem: na minha chamada, a lista ao vivo (`local`); de fora, a
 * que vem com as chamadas do servidor (atualiza no polling).
 */
export function liveWatcherCount(
  userId: string,
  entry: CallStateResponse | undefined,
  local: readonly unknown[] | null
): number {
  if (local) return local.length
  return entry?.screen_watchers?.[userId]?.length ?? 0
}

/** Antes de medir onde cabe, o cartão fica fora da tela e invisível (sem piscar no canto). */
export function placedCardStyle(
  pos: { left: number; top: number } | null
): { left: number; top: number; visibility: 'visible' | 'hidden' } {
  return pos ? { ...pos, visibility: 'visible' } : { left: -9999, top: 0, visibility: 'hidden' }
}

export function watchersLabel(count: number): string {
  return count === 0 ? 'Ninguém assistindo' : `${count} assistindo`
}
