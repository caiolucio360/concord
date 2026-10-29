import { useEffect } from 'react'
import { useAuthStore } from '../../auth/store/authStore'
import { askStartupPermissions } from '../lib/startupPermissions'

/** Assim que a pessoa entra na conta, o Android pergunta notificações, microfone e câmera (uma vez por sessão do app). */
export function useStartupPermissions(): void {
  const signedIn = useAuthStore((s) => s.status === 'signedIn')

  useEffect(() => {
    if (!signedIn) return
    void askStartupPermissions()
  }, [signedIn])
}
