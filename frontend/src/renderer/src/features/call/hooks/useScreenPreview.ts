import { useEffect, useState } from 'react'
import { getScreenPreview } from '../api/calls'
import { previewDataUrl } from '../lib/screenPreview'
import { pollScreenPreview } from '../lib/screenPreviewFlow'

/**
 * Foto da transmissão de `userId` enquanto quem usa está montado (cartão de
 * perfil, prévia do selo LIVE). Ao desmontar, para de buscar.
 */
export function useScreenPreview(
  callId: string,
  userId: string
): { src: string | null; ended: boolean } {
  const [src, setSrc] = useState<string | null>(null)
  const [ended, setEnded] = useState(false)

  useEffect(
    () =>
      pollScreenPreview({
        fetch: () => getScreenPreview(callId, userId),
        onImage: (image) => setSrc(previewDataUrl(image)),
        onEnded: () => setEnded(true)
      }),
    [callId, userId]
  )

  return { src, ended }
}
