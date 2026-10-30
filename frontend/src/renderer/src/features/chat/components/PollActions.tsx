import Button from '../../../shared/ui/Button'

interface PollActionsProps {
  closed: boolean
  hasVoted: boolean
  isAuthor: boolean
  peek: boolean
  showResults: boolean
  busy: boolean
  canVote: boolean
  onTogglePeek: () => void
  onRemoveVote: () => void
  onEnd: () => void
  onVote: () => void
}

const LINK =
  'cursor-pointer rounded-md px-2 py-1 text-ds-xs font-semibold text-secondary transition-colors hover:text-strong disabled:opacity-50'

/** Botões ao pé da enquete: espiar, remover voto, encerrar e votar. */
function PollActions(p: PollActionsProps): React.JSX.Element {
  const open = !p.closed
  return (
    <div className="ml-auto flex items-center gap-2">
      {open && !p.hasVoted && (
        <button type="button" onClick={p.onTogglePeek} className={LINK}>
          {p.peek ? 'Voltar a votar' : 'Mostrar resultados'}
        </button>
      )}
      {open && p.hasVoted && (
        <button type="button" disabled={p.busy} onClick={p.onRemoveVote} className={LINK}>
          Remover voto
        </button>
      )}
      {open && p.isAuthor && (
        <button
          type="button"
          disabled={p.busy}
          onClick={p.onEnd}
          className="cursor-pointer rounded-md px-2 py-1 text-ds-xs font-semibold text-secondary transition-colors hover:text-danger disabled:opacity-50"
        >
          Encerrar enquete
        </button>
      )}
      {!p.showResults && (
        <Button type="button" size="sm" disabled={p.busy || !p.canVote} onClick={p.onVote}>
          Votar
        </Button>
      )}
    </div>
  )
}

export default PollActions
