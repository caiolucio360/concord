import { useEffect } from 'react'
import { onWsEvent } from '../../../shared/api/ws'
import { useCallSessionStore } from '../../call/store/callSessionStore'
import { useMusicStore } from '../store/musicStore'

/**
 * Liga o Maestro ao app: repassa os eventos `music:*` à store e, estando numa chamada de canal de voz,
 * carrega o que ele toca (a cada chamada nova); ao sair, limpa. Igual ao delegate + useVoiceChannelMusic do desktop.
 */
export function useMusicEvents(): void {
  const callId = useCallSessionStore((s) => s.callId)
  const serverId = useCallSessionStore((s) => (s.kind === 'channel' ? s.serverId : undefined))

  useEffect(() => {
    return onWsEvent((event) => {
      if (event.type.startsWith('music:')) useMusicStore.getState().handleWsEvent(event)
    })
  }, [])

  useEffect(() => {
    if (!callId || !serverId) return
    void useMusicStore.getState().loadState(serverId).catch(() => {})
    return () => useMusicStore.getState().clearState()
  }, [callId, serverId])
}
