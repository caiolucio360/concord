import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useImageZoom } from '../hooks/useImageZoom'
import { IDENTITY } from '../lib/imageZoom'
import { ZOOM_STEP, zoomImageClass, zoomTransform } from '../lib/zoomInput'
import ZoomControls from './ZoomControls'

// Fixo: o hook escreve o transform direto no <img>, e o React não o sobrescreve num re-render.
const INITIAL_STYLE = { transform: zoomTransform(IDENTITY) }

/**
 * Imagem em tamanho grande; fecha com Esc ou clique fora dela. Roda, pinça, arraste,
 * duplo clique, a barra de zoom e as teclas + − 0 e setas dão zoom e movem.
 */
function MediaLightbox({
  src,
  alt,
  onClose,
  onContextMenu
}: {
  src: string
  alt: string
  onClose: () => void
  onContextMenu?: (e: React.MouseEvent) => void
}): React.JSX.Element {
  const stageRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const levelRef = useRef<HTMLSpanElement>(null)
  const zoom = useImageZoom({ stage: stageRef, image: imgRef, level: levelRef })

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Soltar o arraste fora da imagem não conta como "clique fora".
  const onBackdropClick = (): void => {
    if (!zoom.consumeDrag()) onClose()
  }

  return createPortal(
    <div
      ref={stageRef}
      role="dialog"
      aria-label={alt}
      className="fixed inset-0 z-[60] flex touch-none select-none overscroll-contain items-center justify-center overflow-hidden bg-black/80"
      onClick={onBackdropClick}
      onContextMenu={onContextMenu}
      {...zoom.handlers}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        draggable={false}
        onClick={(e) => {
          e.stopPropagation()
          zoom.consumeDrag()
        }}
        onDoubleClick={zoom.toggleAt}
        style={INITIAL_STYLE}
        className={`max-h-[calc(100dvh-8rem)] max-w-[90vw] rounded-md object-contain shadow-2xl will-change-transform ${zoomImageClass(zoom.limit !== 'min', zoom.dragging)}`}
      />
      <ZoomControls
        limit={zoom.limit}
        levelRef={levelRef}
        onZoomOut={() => zoom.zoomBy(1 / ZOOM_STEP)}
        onZoomIn={() => zoom.zoomBy(ZOOM_STEP)}
        onReset={zoom.reset}
      />
    </div>,
    document.body
  )
}

export default MediaLightbox
