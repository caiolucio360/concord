import type { ImageDraft } from '../hooks/useProposalImages'
import CloseButton from '../../../shared/ui/CloseButton'

/** Miniaturas das imagens do formulário, com progresso, erro e botão de remover. */
function ProposalImageStrip({
  drafts,
  onRemove
}: {
  drafts: ImageDraft[]
  onRemove: (key: string) => void
}): React.JSX.Element | null {
  if (drafts.length === 0) return null
  return (
    <ul className="flex flex-wrap gap-2">
      {drafts.map((d) => (
        <li
          key={d.key}
          className="relative h-20 w-20 overflow-hidden rounded-lg border border-subtle bg-input"
        >
          <img
            src={d.previewUrl}
            alt="Imagem da proposta"
            draggable={false}
            className={`h-full w-full object-cover ${d.error ? 'opacity-30' : ''}`}
          />
          {d.id == null && !d.error && (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-black/50 on-media">
              <div
                className="h-full bg-brand transition-all"
                style={{ width: `${Math.round(d.progress * 100)}%` }}
              />
            </div>
          )}
          {d.error && (
            <span className="absolute inset-0 flex items-center justify-center p-1 text-center text-ds-xxs leading-tight text-danger">
              {d.error}
            </span>
          )}
          <CloseButton
            label="Remover imagem"
            size="xs"
            variant="media"
            className="absolute right-1 top-1"
            onClick={() => onRemove(d.key)}
          />
        </li>
      ))}
    </ul>
  )
}

export default ProposalImageStrip
