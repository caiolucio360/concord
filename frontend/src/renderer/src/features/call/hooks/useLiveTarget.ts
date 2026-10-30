import { useAuthStore } from '../../auth/store/authStore'
import { useCallStore } from '../store/callStore'
import { liveTarget, type LiveTarget } from '../lib/screenPreview'

/**
 * Se dá para assistir a live de `userId` e como (já estou na chamada ou entro
 * no canal). null = não está ao vivo, sou eu, sala trancada ou sem permissão.
 */
export function useLiveTarget(
  userId: string,
  canConnect: (channelId: string) => boolean
): LiveTarget | null {
  const meId = useAuthStore((s) => s.user?.id)
  const serverCalls = useCallStore((s) => s.serverCalls)
  const status = useCallStore((s) => s.status)
  const callId = useCallStore((s) => s.callId)
  const type = useCallStore((s) => s.type)
  const channelId = useCallStore((s) => s.channelId)
  const screenSharers = useCallStore((s) => s.screenSharers)
  const availableScreens = useCallStore((s) => s.availableScreens)
  return liveTarget({
    userId,
    meId,
    call: { status, callId, type, channelId, screenSharers, availableScreens },
    serverCalls,
    canConnect
  })
}
