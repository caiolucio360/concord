import { getScreenToken } from '../api/calls'
import { LIVEKIT_URL } from '../../../shared/lib/config'
import { useNativeLiveStore } from '../store/nativeLiveStore'
import { useScreenAdaptStore } from '../store/screenAdaptStore'
import type { CallMedia } from './livekit'
import { nativeLiveWanted } from './nativeLiveChoice'
import { NativeLiveSession } from './nativeLiveSession'
import { loadScreenSimulcast } from './screenSimulcast'
import type { ScreenShareQuality } from './screenShareQuality'

// A live da chamada pelo motor nativo, para o callStore: tenta, e devolve se
// ficou no ar, se a pessoa desistiu no seletor ou se é para seguir pelo
// Chromium. Uma falha do helper vale para o resto da sessão do app.

export type NativeShareResult = 'started' | 'cancelled' | 'fallback'

let session: NativeLiveSession | null = null
let failedBefore = false

export interface NativeShareRequest {
  callId: string
  quality: ScreenShareQuality
  media: CallMedia
  /** Acabou depois de começar; `failed` = não foi a pessoa (seguir pelo Chromium). */
  onEnded: (failed: boolean) => void
}

async function wanted(): Promise<boolean> {
  const store = useNativeLiveStore.getState()
  return nativeLiveWanted(store.pref, await store.load(), failedBefore)
}

export async function tryNativeLive(request: NativeShareRequest): Promise<NativeShareResult> {
  const bridge = window.api?.nativeLive
  if (!bridge || !(await wanted())) return 'fallback'
  const { media } = request
  const current: NativeLiveSession = new NativeLiveSession(
    {
      bridge,
      url: LIVEKIT_URL,
      token: () => getScreenToken(request.callId),
      simulcast: loadScreenSimulcast() !== 'off',
      onView: (view) => useScreenAdaptStore.getState().setView(view),
      onEnded: (failed) => {
        if (session === current) session = null
        media.setNativeScreen(null)
        if (failed) failedBefore = true
        request.onEnded(failed)
      }
    },
    request.quality
  )
  session = current
  const result = await current.start()
  // Parou (ou a chamada acabou) enquanto o seletor estava aberto.
  if (session !== current) return 'cancelled'
  if (result === 'started') {
    media.setNativeScreen(current)
    return 'started'
  }
  session = null
  if (result === 'cancelled') return 'cancelled'
  failedBefore = true
  return 'fallback'
}

/** A minha live está saindo pelo helper agora. */
export function nativeLiveActive(): boolean {
  return session?.live ?? false
}

/** Troca de degrau escolhida pela pessoa; false = a live não é nativa. */
export function setNativeLiveQuality(quality: ScreenShareQuality): boolean {
  if (!session?.live) return false
  session.setQuality(quality)
  return true
}

/** Para a live nativa, se houver (sem ela, nada a fazer). */
export function stopNativeLive(media: CallMedia | null): void {
  if (!session) return
  session.stop()
  session = null
  media?.setNativeScreen(null)
}

/** Na live nativa, a minha prévia é a minha tela vinda do servidor (camada de baixo). */
export function nativeLivePreview(
  screenStreams: Record<string, MediaStream>,
  meId: string | null
): { localScreenStream: MediaStream | null } | null {
  if (!nativeLiveActive() || !meId) return null
  return { localScreenStream: screenStreams[meId] ?? null }
}
