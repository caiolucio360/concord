import { useEffect, type RefObject } from 'react'
import { insideElement } from '../lib/insideElement'

/** O clique foi fora do seletor? */
export function isOutside(container: HTMLElement | null, target: EventTarget | null): boolean {
  return Boolean(container) && !insideElement(container, target)
}

/**
 * Fecha o seletor de mídia com clique fora ou Esc. Com um modal aberto por
 * cima (`blocked`, ex.: enviar figurinha ou emoji), não fecha: o modal fica
 * fora do seletor e o clique nele não pode derrubar os dois.
 */
export function useMediaPickerDismiss(
  ref: RefObject<HTMLElement | null>,
  blocked: boolean,
  onClose: () => void
): void {
  useEffect(() => {
    const onMouseDown = (e: MouseEvent): void => {
      if (!blocked && isOutside(ref.current, e.target)) onClose()
    }
    const onKeyDown = (e: KeyboardEvent): void => {
      if (!blocked && e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [ref, blocked, onClose])
}
