import * as Notifications from 'expo-notifications'
import type { PushPlatform } from './pushRegistration'

export const MESSAGES_CHANNEL = 'mensagens'
/** Canal das chamadas de DM recebidas (o backend manda `channel_id: chamadas`). */
export const CALLS_CHANNEL = 'chamadas'

/**
 * Com o app aberto só aparece o aviso que o próprio app cria (`in_app`: DM ou menção fora da conversa aberta);
 * um push que chegue nesse meio tempo fica quieto, porque o aviso local já cobre a mesma mensagem.
 */
export function foregroundBehavior(data: Record<string, unknown> | undefined): Notifications.NotificationBehavior {
  const show = data?.in_app === true
  return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: show, shouldSetBadge: false }
}

export function silenceForeground(): void {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => foregroundBehavior(notification.request.content.data as Record<string, unknown> | undefined)
  })
}

/** Mostra agora o aviso do app aberto, no canal das mensagens (o toque usa a mesma rota do push). */
export async function presentInApp(n: { title: string; body: string; data: Record<string, unknown> }): Promise<void> {
  await Notifications.scheduleNotificationAsync({ content: { title: n.title, body: n.body, data: n.data }, trigger: { channelId: MESSAGES_CHANNEL } })
}

async function requestPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync()
  if (current.granted) return true
  return (await Notifications.requestPermissionsAsync()).granted
}

async function getToken(): Promise<string | null> {
  const token = await Notifications.getDevicePushTokenAsync()
  return typeof token.data === 'string' && token.data !== '' ? token.data : null
}

export const expoPlatform: PushPlatform = {
  async ensureChannel() {
    await Notifications.setNotificationChannelAsync(MESSAGES_CHANNEL, {
      name: 'Mensagens',
      importance: Notifications.AndroidImportance.HIGH
    })
    await Notifications.setNotificationChannelAsync(CALLS_CHANNEL, {
      name: 'Chamadas',
      importance: Notifications.AndroidImportance.HIGH
    })
  },
  requestPermission,
  getToken,
  onTokenChange(cb) {
    const sub = Notifications.addPushTokenListener((t) => {
      if (typeof t.data === 'string') cb(t.data)
    })
    return () => sub.remove()
  }
}

type Data = Record<string, unknown> | undefined

/** Toque na notificação com o app aberto ou em segundo plano. */
export function onNotificationTap(cb: (data: Data) => void): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((r) => cb(r.notification.request.content.data))
  return () => sub.remove()
}

/** Toque que abriu o app do zero (consumido uma vez, para não reabrir a tela a cada início). */
export async function takeLaunchTap(): Promise<Data> {
  const response = await Notifications.getLastNotificationResponseAsync()
  if (!response) return undefined
  await Notifications.clearLastNotificationResponseAsync()
  return response.notification.request.content.data
}
