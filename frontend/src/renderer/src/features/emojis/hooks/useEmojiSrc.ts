import { useEffect, useState } from 'react'
import { cachedEmojiSrc, retryEmojiSrc, subscribeEmojiSrc } from '../store/emojiSrc'

/**
 * URL da imagem do emoji (null até ter o media token) e o que fazer quando a
 * imagem falha: pedir uma URL nova, com o token atual.
 */
export function useEmojiSrc(id: string, enabled = true): { src: string | null; onError: () => void } {
  const [src, setSrc] = useState<string | null>(() => cachedEmojiSrc(id) ?? null)
  useEffect(() => subscribeEmojiSrc(id, enabled, setSrc), [id, enabled])
  return { src, onError: () => src && retryEmojiSrc(id, src, setSrc) }
}
