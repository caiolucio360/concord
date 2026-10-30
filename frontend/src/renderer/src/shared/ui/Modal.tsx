import { useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import CloseButton from './CloseButton'
import { useModalBehavior } from '../hooks/useModalBehavior'
import { trapTab } from '../lib/focusTrap'
import { modalLayout } from '../lib/modalLayout'

interface ModalProps {
  open: boolean
  title?: string
  onClose?: () => void
  /** Janela larga (editores com lista e painel lado a lado). */
  wide?: boolean
  /** Ainda mais larga (detalhe com conteúdo e conversa lado a lado). */
  xl?: boolean
  children?: ReactNode
}

function Modal({
  open,
  title,
  onClose,
  wide = false,
  xl = false,
  children
}: ModalProps): React.JSX.Element | null {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  // Foco entra e volta, Esc fecha o do topo (o Tab fica preso no onKeyDown abaixo).
  useModalBehavior(open, onClose, dialogRef)

  if (!open) return null
  const layout = modalLayout({ wide, xl })

  // Fora dos painéis com blur/transform, para que o viewport seja sempre a janela.
  return createPortal(
    <div
      className={layout.backdrop}
      style={{ top: 'var(--titlebar-height, 0px)' }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={layout.dialog}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => trapTab(e, dialogRef.current)}
      >
        <div className="mb-4 flex shrink-0 items-center justify-between gap-4">
          {title && (
            <h2 id={titleId} className="min-w-0 break-words text-lg font-semibold text-strong">
              {title}
            </h2>
          )}
          {onClose && (
            <CloseButton className="app-no-drag ml-auto" onClick={onClose} />
          )}
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>,
    document.body
  )
}

export default Modal
