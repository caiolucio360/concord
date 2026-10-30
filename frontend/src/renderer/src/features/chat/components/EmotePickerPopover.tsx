import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import EmojiPickerGrid from '../../emojis/components/EmojiPickerGrid'
import { useEmotePickerPlacement } from '../hooks/useEmotePickerPlacement'
import { useAnchoredPickerPlacement } from '../hooks/useAnchoredPickerPlacement'
import { useEmotePickerDismiss } from '../hooks/useEmotePickerDismiss'
import { useIsMobile } from '../../navigation/hooks/useIsMobile'

/** Classes comuns; a posição muda conforme a âncora (veja `PLACE_*`). */
const BASE =
  'flex w-64 flex-col rounded-xl border border-subtle bg-floating p-3 shadow-2xl max-md:animate-sheet-in max-md:fixed max-md:inset-x-0 max-md:top-auto max-md:bottom-0 max-md:z-50 max-md:w-full max-md:rounded-b-none max-md:pb-[max(0.75rem,env(safe-area-inset-bottom))]'
/** Barra de ações: preso ao canto da linha. */
const PLACE_ROW = 'absolute right-4 top-8 z-30'
/** "+" ao lado dos chips: solto na tela, posicionado pelo estilo (ao lado do botão). */
const PLACE_ANCHORED = 'fixed z-50'

/** Emojis (personalizados e o pack base), cada um um botão; a reação leva <:id> no personalizado. */
function EmoteGrid({
  search,
  onPick
}: {
  search: string
  onPick: (emoji: string) => void
}): React.JSX.Element {
  return (
    <div className="max-h-56 min-h-0 overflow-y-auto overscroll-contain pr-1 max-md:max-h-[45dvh]">
      <EmojiPickerGrid search={search} mode="reaction" onPick={onPick} />
    </div>
  )
}

/** A âncora só vale fora do celular: lá o seletor é folha de baixo, na largura toda. */
function useFloatingAnchor(anchor: HTMLElement | null): HTMLElement | null {
  return useIsMobile() ? null : anchor
}

/** O seletor em si: busca e emojis, preso ao canto da linha ou ao lado de `anchor`. */
function EmotePickerPanel({
  anchor,
  onSelect,
  onClose
}: {
  anchor: HTMLElement | null
  onSelect: (emoji: string) => void
  onClose: () => void
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState('')
  const floating = useFloatingAnchor(anchor)
  // Perto do fim da lista abre para cima (não fica cortado atrás do campo).
  const rowStyle = useEmotePickerPlacement(ref)
  const anchoredStyle = useAnchoredPickerPlacement(ref, floating)
  useEmotePickerDismiss(ref, anchor, floating !== null, onClose)

  // Fora da linha o seletor não é irmão do botão: leva o foco do teclado para a busca.
  useEffect(() => {
    if (floating) searchRef.current?.focus({ preventScroll: true })
  }, [floating])

  const pick = (emoji: string): void => {
    onSelect(emoji)
    onClose()
    // Teclado: devolve o foco ao botão que abriu (o seletor some).
    if (anchor?.isConnected) anchor.focus()
  }

  return (
    <div
      ref={ref}
      style={anchoredStyle ?? rowStyle}
      onClick={(e) => e.stopPropagation()}
      // Celular: folha de baixo na largura toda (o canto da linha pode estar no fim da tela).
      className={`${anchor ? PLACE_ANCHORED : PLACE_ROW} ${BASE}`}
    >
      <input
        ref={searchRef}
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar emote…"
        aria-label="Buscar emote"
        className="mb-2 w-full rounded-md border border-subtle bg-input px-2.5 py-1 text-ds-xs text-strong max-md:py-2 max-md:text-ds-md placeholder:text-faint outline-none focus:border-brand/50"
      />
      <EmoteGrid search={search} onPick={pick} />
    </div>
  )
}

/**
 * Seletor de emoji das reações (busca + categorias). Sem `anchor`, posiciona-se
 * no canto da linha (barra de ações); com `anchor` (o "+" ao lado dos chips),
 * abre ao lado desse botão, num portal (o scroll do chat não o corta).
 */
function EmotePickerPopover({
  anchor = null,
  onSelect,
  onClose
}: {
  /** Botão que abriu o seletor; null = a barra de ações. */
  anchor?: HTMLElement | null
  onSelect: (emoji: string) => void
  onClose: () => void
}): React.JSX.Element {
  const panel = <EmotePickerPanel anchor={anchor} onSelect={onSelect} onClose={onClose} />
  return anchor ? createPortal(panel, document.body) : panel
}

export default EmotePickerPopover
