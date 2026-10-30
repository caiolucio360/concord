import type { ProposalComment } from '../api/proposals'
import { commentPreview } from '../lib/proposals'
import CloseButton from '../../../shared/ui/CloseButton'
import PreviewText from '../../chat/components/PreviewText'

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
        <PreviewText preview={commentPreview(replyingTo)} className="ml-2 text-gray-400" />
      </div>
      <CloseButton
        label="Cancelar resposta"
        title="Cancelar resposta (Esc)"
        size="sm"
        onClick={onCancel}
      />
    </div>
  )
}

export default CommentReplyBar
