import { MinusIcon, PlusIcon } from '../../../shared/ui/icons'
import type { ZoomLimit } from '../lib/zoomInput'

const BUTTON =
  'flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white aria-disabled:opacity-40 aria-disabled:hover:bg-transparent'

// Clique, arraste e duplo clique na barra não chegam ao palco (que fecharia ou daria zoom).
const stop = (e: React.SyntheticEvent): void => e.stopPropagation()

/**
 * Barra de zoom do lightbox: só os ícones − e +. Nas pontas os botões ficam
 * `aria-disabled` (não `disabled`): o foco do teclado não se perde, e o clique ali
 * já não muda nada (a escala fica presa entre 1x e 5x).
 */
function ZoomControls({
  limit,
  onZoomOut,
  onZoomIn
}: {
  limit: ZoomLimit
  onZoomOut: () => void
  onZoomIn: () => void
}): React.JSX.Element {
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
        aria-disabled={limit === 'min'}
        onClick={onZoomOut}
        className={BUTTON}
      >
        <MinusIcon />
      </button>
      <button
        type="button"
        aria-label="Aumentar zoom"
        aria-disabled={limit === 'max'}
        onClick={onZoomIn}
        className={BUTTON}
      >
        <PlusIcon />
      </button>
    </div>
  )
}

export default ZoomControls
