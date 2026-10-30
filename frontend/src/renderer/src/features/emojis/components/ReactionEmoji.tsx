import { reactionEmojiId } from '../lib/emojiToken'
import { useEmojiStore } from '../store/emojiStore'
import CustomEmoji from './CustomEmoji'

/** Nome legível da reação: o próprio emoji ou ":nome:" do personalizado. */
export function useReactionLabel(emoji: string): string {
  const id = reactionEmojiId(emoji)
  const name = useEmojiStore((s) => (id ? s.byId[id]?.name : undefined))
  if (!id) return emoji
  return `:${name ?? 'emoji'}:`
}

/** Emoji de uma reação: Unicode como texto, personalizado como imagem. */
export default function ReactionEmoji({ emoji }: { emoji: string }): React.JSX.Element {
  const id = reactionEmojiId(emoji)
  const name = useEmojiStore((s) => (id ? s.byId[id]?.name : undefined))
  if (!id) return <>{emoji}</>
  return <CustomEmoji id={id} name={name ?? 'emoji'} size="reaction" />
}
