export interface Rect {
  top: number
  left: number
  right: number
  bottom: number
}

/**
 * Lado preferido do cartão em relação ao que foi clicado. 'top' é o da barra
 * de baixo: abre acima, alinhado à esquerda do item.
 */
export type CardSide = 'left' | 'right' | 'top'

const MARGIN = 8

/**
 * Onde abrir o cartão de perfil (como no Discord): ao lado do que foi
 * clicado, no lado preferido; se não couber, no outro lado; e sempre dentro
 * da janela, alinhado ao topo do item clicado quando der.
 */
export function placeProfileCard(
  anchor: Rect,
  side: CardSide,
  card: { width: number; height: number },
  viewport: { width: number; height: number }
): { left: number; top: number } {
  if (side === 'top') return placeAbove(anchor, card, viewport)
  const leftOf = anchor.left - MARGIN - card.width
  const rightOf = anchor.right + MARGIN
  const fitsLeft = leftOf >= MARGIN
  const fitsRight = rightOf + card.width <= viewport.width - MARGIN

  let left = side === 'left' ? (fitsLeft ? leftOf : rightOf) : fitsRight ? rightOf : leftOf
  left = Math.min(Math.max(MARGIN, left), viewport.width - card.width - MARGIN)

  const maxTop = viewport.height - card.height - MARGIN
  const top = Math.max(MARGIN, Math.min(anchor.top, maxTop))
  return { left, top }
}

/** Acima do item; se não couber, abaixo; sempre dentro da janela. */
function placeAbove(
  anchor: Rect,
  card: { width: number; height: number },
  viewport: { width: number; height: number }
): { left: number; top: number } {
  const above = anchor.top - MARGIN - card.height
  const below = anchor.bottom + MARGIN
  let top = above >= MARGIN ? above : below
  top = Math.max(MARGIN, Math.min(top, viewport.height - card.height - MARGIN))
  const left = Math.max(MARGIN, Math.min(anchor.left, viewport.width - card.width - MARGIN))
  return { left, top }
}

/** "25 de out. de 2026". */
export function formatMemberSince(iso: string | undefined): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Largura do cartão de perfil (px). */
export const PROFILE_CARD_WIDTH = 300

/**
 * Estilo do cartão: escondido fora da tela até medir, depois na posição
 * calculada. "fixed" ganha do relative da moldura (o tema troca o padding-box).
 */
export function cardPlacementStyle(pos: { left: number; top: number } | null): {
  width: number
  left: number
  top: number
  visibility: 'visible' | 'hidden'
  position: 'fixed'
} {
  return {
    width: PROFILE_CARD_WIDTH,
    left: pos?.left ?? -9999,
    top: pos?.top ?? 0,
    visibility: pos ? 'visible' : 'hidden',
    position: 'fixed'
  }
}

/** O suficiente de um nó do DOM para saber onde o clique caiu. */
interface ClickNode {
  closest?: (selector: string) => unknown
}
interface Container {
  contains: (node: never) => boolean
}

/**
 * Clique que não fecha o cartão: no próprio cartão, no item que o abriu ou num
 * menu de contexto aberto a partir dele (configs, "Mais").
 */
export function keepsCardOpen(
  node: object,
  card: Container | null,
  anchor: Container | undefined
): boolean {
  if (card?.contains(node as never) || anchor?.contains(node as never)) return true
  return Boolean((node as ClickNode).closest?.('[data-user-context-menu]'))
}

/** O menu "Mais" aberto pelo cartão desta pessoa: fecha junto com o cartão. */
export function isCardMenu(
  menu: { userId: string; anchorEl?: unknown } | null,
  userId: string | undefined
): boolean {
  return Boolean(menu && menu.userId === userId && menu.anchorEl)
}
