import { useEffect } from 'react'
import { onWsEvent } from '../../../shared/api/ws'
import type { Message } from '../../chat/api/messages'
import { useAuthStore } from '../../auth/store/authStore'
import { useActiveRoomStore } from '../../chat/store/activeRoomStore'
import { presentInApp } from '../lib/expoPush'
import { inAppNotificationFor } from '../lib/inAppNotification'

/** Com o app aberto o servidor não manda push: este hook avisa de DM e de menção que chegam fora da conversa aberta. */
export function useInAppNotifications(): void {
  const signedIn = useAuthStore((s) => s.status === 'signedIn')

  useEffect(() => {
    if (!signedIn) return
    return onWsEvent((event) => {
      if (event.type !== 'message:create') return
      const me = useAuthStore.getState().user
      if (!me) return
      const n = inAppNotificationFor(event.payload as { message?: Message; server_id?: string }, me, useActiveRoomStore.getState().active)
      if (n) void presentInApp(n).catch(() => {})
    })
  }, [signedIn])
}
