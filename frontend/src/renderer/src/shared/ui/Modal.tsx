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
  /**
   * Sem moldura: sem cabeçalho nem padding, o conteúdo desenha o próprio
   * layout (ex.: badges com a coluna e o detalhe) e o X fica no canto.
   */
  bare?: boolean
  /** Id do título que está dentro do conteúdo (modal sem `title`). */
  labelledBy?: string
  children?: ReactNode
}

/** Cabeçalho único dos modais: título na escala e o X. */
function ModalHeader({
  title,
  titleId,
  onClose
}: {
  title?: string
  titleId: string
  onClose?: () => void
}): React.JSX.Element {
  return (
    <div className="mb-4 flex shrink-0 items-center justify-between gap-4">
      {title && (
        <h2 id={titleId} className="min-w-0 break-words text-ds-lg font-semibold text-strong">
          {title}
        </h2>
      )}
      {onClose && <CloseButton className="app-no-drag ml-auto" onClick={onClose} />}
    </div>
  )
}

function Modal({
  open,
  title,
  onClose,
  wide = false,
  xl = false,
  bare = false,
  labelledBy,
  children
}: ModalProps): React.JSX.Element | null {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  // Foco entra e volta, Esc fecha o do topo (o Tab fica preso no onKeyDown abaixo).
  useModalBehavior(open, onClose, dialogRef)

  if (!open) return null
  const layout = modalLayout({ wide, xl, bare })

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
        aria-labelledby={title ? titleId : labelledBy}
        className={layout.dialog}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => trapTab(e, dialogRef.current)}
      >
        {bare ? (
          onClose && (
            <CloseButton
              size="sm"
              className="app-no-drag absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-10"
              onClick={onClose}
            />
          )
        ) : (
          <ModalHeader title={title} titleId={titleId} onClose={onClose} />
        )}
        <div className={layout.body}>{children}</div>
      </div>
    </div>,
    document.body
  )
}

export default Modal
