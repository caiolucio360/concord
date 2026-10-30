import * as Notifications from 'expo-notifications'
import { expoPlatform, foregroundBehavior, presentInApp, silenceForeground } from './expoPush'

describe('expoPlatform.ensureChannel', () => {
  it('cria o canal das mensagens e o das chamadas, com importância alta', async () => {
    await expoPlatform.ensureChannel()
    const calls = jest.mocked(Notifications.setNotificationChannelAsync).mock.calls
    const ids = calls.map(([id]) => id)
    expect(ids).toEqual(expect.arrayContaining(['mensagens', 'chamadas']))
    expect(calls.every(([, channel]) => channel.importance === Notifications.AndroidImportance.HIGH)).toBe(true)
  })
})

describe('com o app aberto', () => {
  it('mostra o aviso local do próprio app (in_app) e silencia o resto (bug: silenciava tudo, nada aparecia com o app aberto)', () => {
    expect(foregroundBehavior({ type: 'dm', in_app: true })).toMatchObject({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true })
    expect(foregroundBehavior({ type: 'dm' })).toMatchObject({ shouldShowBanner: false, shouldPlaySound: false })
    expect(foregroundBehavior(undefined)).toMatchObject({ shouldShowBanner: false })
  })

  it('o handler registrado segue essa regra', async () => {
    silenceForeground()
    const handler = jest.mocked(Notifications.setNotificationHandler).mock.calls.at(-1)?.[0]
    const result = await handler?.handleNotification({ request: { content: { data: { in_app: true } } } } as never)
    expect(result).toMatchObject({ shouldShowBanner: true })
  })

  it('presentInApp mostra na hora, no canal das mensagens', async () => {
    await presentInApp({ title: 'Ana', body: 'oi', data: { type: 'dm', conversation_id: 'c1', in_app: true } })
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: { title: 'Ana', body: 'oi', data: { type: 'dm', conversation_id: 'c1', in_app: true } },
      trigger: { channelId: 'mensagens' }
    })
  })
})
