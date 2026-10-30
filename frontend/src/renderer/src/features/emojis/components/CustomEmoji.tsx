import { useEmojiStore } from '../store/emojiStore'
import { useCustomEmojis } from '../hooks/useCustomEmojis'
import { useEmojiSrc } from '../hooks/useEmojiSrc'

export type CustomEmojiSize = 'inline' | 'jumbo' | 'reaction' | 'picker'

const SIZE_CLASS: Record<CustomEmojiSize, string> = {
  inline: 'h-[1.375em] w-[1.375em] align-[-0.3em]',
  jumbo: 'h-12 w-12',
  reaction: 'h-5 w-5',
  picker: 'h-7 w-7'
}

const SIZE_PX: Record<CustomEmojiSize, number> = { inline: 22, jumbo: 48, reaction: 20, picker: 28 }

/**
 * Emoji personalizado. Só quem é membro do servidor dele vê a imagem; para os
 * outros (ou emoji apagado) fica o ":nome:". Antes de a lista chegar, guarda o
 * espaço do emoji para a linha não pular.
 */
export default function CustomEmoji({
  id,
  name,
  size = 'inline'
}: {
  id: string
  name: string
  size?: CustomEmojiSize
}): React.JSX.Element {
  useCustomEmojis()
  const known = useEmojiStore((s) => id in s.byId)
  const loaded = useEmojiStore((s) => s.loaded)
  const src = useEmojiSrc(id, known)
  const label = `:${name}:`
  if (!known && loaded) return <>{label}</>
  if (!known || !src) {
    return <span role="img" aria-label={label} className={`inline-block ${SIZE_CLASS[size]}`} />
  }
  return (
    <img
      src={src}
      alt={label}
      title={label}
      width={SIZE_PX[size]}
      height={SIZE_PX[size]}
      loading="lazy"
      decoding="async"
      draggable={false}
      className={`inline-block object-contain ${SIZE_CLASS[size]}`}
    />
  )
}
