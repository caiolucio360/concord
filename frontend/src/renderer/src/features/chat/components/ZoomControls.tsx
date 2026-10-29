import type { RefObject } from 'react'
import { MinusIcon, PlusIcon } from '../../../shared/ui/icons'
import type { ZoomLimit } from '../lib/zoomInput'

const BUTTON =
  'flex h-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40 disabled:hover:bg-transparent'
const ICON_BUTTON = `${BUTTON} w-10`

// Clique, arraste e duplo clique na barra não chegam ao palco (que fecharia ou daria zoom).
const stop = (e: React.SyntheticEvent): void => e.stopPropagation()

/**
 * Barra de zoom do lightbox: −, nível atual (clicar volta à imagem inteira) e +.
 * O texto do nível é escrito direto no DOM pelo useImageZoom (`levelRef`), sem re-render.
 */
function ZoomControls({
  limit,
  levelRef,
  onZoomOut,
  onZoomIn,
  onReset
}: {
  limit: ZoomLimit
  levelRef: RefObject<HTMLSpanElement | null>
  onZoomOut: () => void
  onZoomIn: () => void
  onReset: () => void
}): React.JSX.Element {
  const atMin = limit === 'min'
  return (
    <div
      className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/70 p-1 shadow-lg"
      onClick={stop}
      onPointerDown={stop}
      onDoubleClick={stop}
    >
      <button
        type="button"
        aria-label="Diminuir zoom"
        disabled={atMin}
        onClick={onZoomOut}
        className={ICON_BUTTON}
      >
        <MinusIcon />
      </button>
      <button
        type="button"
        aria-label="Voltar ao tamanho original"
        disabled={atMin}
        onClick={onReset}
        className={`${BUTTON} min-w-16 px-2 text-sm tabular-nums`}
      >
        <span ref={levelRef}>100%</span>
      </button>
      <button
        type="button"
        aria-label="Aumentar zoom"
        disabled={limit === 'max'}
        onClick={onZoomIn}
        className={ICON_BUTTON}
      >
        <PlusIcon />
      </button>
    </div>
  )
}

export default ZoomControls
