import type { Message } from '../../chat/api/messages'
import { splitMentions } from '../../chat/lib/mentions'
import { MAESTRO_NAME, splitBold, T18 } from '../lib/music'
import MaestroAvatar from './MaestroAvatar'
import MentionChip from '../../chat/components/MentionChip'

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/** Texto do Maestro: **negrito** e @menções destacadas. */
export function MaestroText({ text }: { text: string }): React.JSX.Element {
  return (
    <>
      {splitBold(text).map((part, i) =>
        part.bold ? (
          <strong key={i} className="font-bold text-strong">
            {part.text}
          </strong>
        ) : (
          splitMentions(part.text).map((m, j) =>
            m.mention ? (
              <MentionChip
                key={`${i}-${j}`}
                mention={m.mention}
                displayText={m.text}
              />
            ) : (
              <span key={`${i}-${j}`}>{m.text}</span>
            )
          )
        )
      )}
    </>
  )
}

function MusicMessage({ message }: { message: Message }): React.JSX.Element {
  return (
    <div
      id={`msg-${message.id}`}
      className="mx-2 my-1 flex gap-3 rounded-lg border border-brand/20 bg-gradient-to-r from-brand/10 to-transparent px-3 py-2.5"
    >
      <MaestroAvatar />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-brand">{MAESTRO_NAME}</span>
          <span className="rounded bg-brand/20 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-brand">
            {T18.tag}
          </span>
          <span className="text-[10px] text-gray-500">{formatTime(message.created_at)}</span>
        </div>
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-100">
          <MaestroText text={message.content} />
        </p>
      </div>
    </div>
  )
}

export default MusicMessage
