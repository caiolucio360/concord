import { useEffect, useState } from 'react'
import { fetchServerStickers, type ServerSticker } from '../api/stickers'

/** Figurinhas do servidor do canal aberto (sem serverId, como na DM, não há figurinhas). */
export function useServerStickers(serverId: string | null | undefined, enabled: boolean): { stickers: ServerSticker[]; loading: boolean } {
  const [loaded, setLoaded] = useState<{ serverId: string; stickers: ServerSticker[] } | null>(null)

  useEffect(() => {
    if (!enabled || !serverId) return
    let cancelled = false
    fetchServerStickers(serverId)
      .catch(() => [] as ServerSticker[])
      .then((stickers) => {
        if (!cancelled) setLoaded({ serverId, stickers })
      })
    return () => {
      cancelled = true
    }
  }, [enabled, serverId])

  const ready = loaded !== null && loaded.serverId === serverId
  return { stickers: ready ? loaded.stickers : [], loading: enabled && Boolean(serverId) && !ready }
}
