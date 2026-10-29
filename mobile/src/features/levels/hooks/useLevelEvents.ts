import { useEffect } from 'react'
import { onWsEvent } from '../../../shared/api/ws'
import { useAuthStore } from '../../auth/store/authStore'
import { useLevelStore } from '../store/levelStore'

/** Mantém o nível e o XP de quem está logado: carrega ao entrar e segue o `level:update` do servidor. */
export function useLevelEvents(): void {
  const signedIn = useAuthStore((s) => s.status === 'signedIn')

  useEffect(() => {
    if (!signedIn) return
    void useLevelStore.getState().loadMe().catch(() => {})
    return onWsEvent((event) => useLevelStore.getState().handleWsEvent(event))
  }, [signedIn])
}
