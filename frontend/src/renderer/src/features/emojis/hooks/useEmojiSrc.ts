import { useEffect, useState } from 'react'
import { cachedEmojiSrc, subscribeEmojiSrc } from '../store/emojiSrc'

/** URL da imagem do emoji (null até ter o media token). */
export function useEmojiSrc(id: string, enabled = true): string | null {
  const [src, setSrc] = useState<string | null>(() => cachedEmojiSrc(id) ?? null)
  useEffect(() => subscribeEmojiSrc(id, enabled, setSrc), [id, enabled])
  return src
}
