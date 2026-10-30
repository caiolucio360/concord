import { useEffect } from 'react'
import { useEmojiStore } from '../store/emojiStore'
import { startEmojiWatch } from '../store/emojiWatch'

/** Garante a lista de emojis da pessoa (uma carga por sessão). */
export function useCustomEmojis(): void {
  useEffect(() => {
    startEmojiWatch()
    void useEmojiStore.getState().ensureLoaded()
  }, [])
}
