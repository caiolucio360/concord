import type { ProposalComment } from '../api/proposals'
import { commentPreview } from '../lib/proposals'

/** "Respondendo a @fulano" acima do campo, com o botão de cancelar. */
function CommentReplyBar({
  replyingTo,
  onCancel
}: {
  replyingTo: ProposalComment | null
  onCancel: () => void
}): React.JSX.Element | null {
  if (!replyingTo) return null
  return (
    <div
      data-reply-bar
      className="flex items-center justify-between gap-2 rounded-lg border border-subtle bg-floating px-3 py-1.5 text-ds-sm text-gray-300"
    >
      <div className="min-w-0 truncate">
        Respondendo a{' '}
        <span className="font-semibold text-strong">@{replyingTo.author_name}</span>
        <span className="ml-2 text-gray-400">{commentPreview(replyingTo)}</span>
      </div>
      <button
        type="button"
        onClick={onCancel}
        title="Cancelar resposta (Esc)"
        aria-label="Cancelar resposta"
        className="shrink-0 cursor-pointer rounded px-1.5 py-0.5 text-gray-400 transition-colors hover:bg-fg/10 hover:text-strong"
      >
        ✕
      </button>
    </div>
  )
}

export default CommentReplyBar
