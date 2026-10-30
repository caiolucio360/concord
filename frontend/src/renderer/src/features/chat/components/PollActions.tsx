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
  'cursor-pointer rounded-md px-2 py-1 text-xs font-semibold text-gray-300 transition-colors hover:text-strong disabled:opacity-50'

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
          className="cursor-pointer rounded-md px-2 py-1 text-xs font-semibold text-gray-300 transition-colors hover:text-danger disabled:opacity-50"
        >
          Encerrar enquete
        </button>
      )}
      {!p.showResults && (
        <button
          type="button"
          disabled={p.busy || !p.canVote}
          onClick={p.onVote}
          className="cursor-pointer rounded-lg bg-brand px-4 py-1.5 text-xs font-semibold text-white transition-all hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          Votar
        </button>
      )}
    </div>
  )
}

export default PollActions
