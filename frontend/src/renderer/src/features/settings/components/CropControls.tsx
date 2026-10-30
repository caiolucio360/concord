import { MAX_ZOOM, MIN_ZOOM } from '../../profile/lib/imageCrop'
import Button from '../../../shared/ui/Button'

export function ZoomSlider({
  zoom,
  onZoom
}: {
  zoom: number
  onZoom: (zoom: number) => void
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 px-6 pt-4">
      <span className="text-ds-xs text-muted">−</span>
      <input
        type="range"
        min={MIN_ZOOM}
        max={MAX_ZOOM}
        step={0.01}
        value={zoom}
        onChange={(e) => onZoom(Number(e.target.value))}
        aria-label="Zoom"
        className="flex-1 accent-brand"
      />
      <span className="text-ds-sm text-muted">+</span>
    </div>
  )
}

export function CropFooter({
  busy,
  canApply,
  onReset,
  onCancel,
  onApply
}: {
  busy: boolean
  canApply: boolean
  onReset: () => void
  onCancel: () => void
  onApply: () => void
}): React.JSX.Element {
  return (
    <div className="mt-5 flex items-center justify-end gap-2 rounded-b-xl bg-input px-5 py-4">
      <button
        type="button"
        onClick={onReset}
        className="mr-auto cursor-pointer text-ds-sm text-secondary hover:underline"
      >
        Redefinir
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="cursor-pointer rounded-md px-4 py-2 text-ds-sm text-strong hover:underline"
      >
        Cancelar
      </button>
      <Button type="button" onClick={onApply} disabled={busy || !canApply}>
        {busy ? 'Aplicando…' : 'Aplicar'}
      </Button>
    </div>
  )
}
