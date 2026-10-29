import { useEffect, useState } from 'react'
import { API_BASE_URL } from '../../../shared/lib/config'
import { stickerFileUrl } from '../lib/attachments'
import { ensureMediaToken } from '../store/mediaToken'

/** URL autenticada da figurinha (token de mídia); null enquanto carrega, failed se o token falhou. */
export function useStickerSrc(stickerId: string): { src: string | null; failed: boolean } {
  const [state, setState] = useState<{ id: string; src: string | null; failed: boolean } | null>(null)
  useEffect(() => {
    let cancelled = false
    ensureMediaToken()
      .then((token) => !cancelled && setState({ id: stickerId, src: stickerFileUrl(API_BASE_URL, stickerId, token), failed: false }))
      .catch(() => !cancelled && setState({ id: stickerId, src: null, failed: true }))
    return () => {
      cancelled = true
    }
  }, [stickerId])
  return state?.id === stickerId ? { src: state.src, failed: state.failed } : { src: null, failed: false }
}
