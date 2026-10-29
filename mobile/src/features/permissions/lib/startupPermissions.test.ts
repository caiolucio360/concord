import { askStartupPermissions, STARTUP_PERMISSIONS, type PermissionPort } from './startupPermissions'

const port = (name: string, granted: boolean, asked: boolean | Error = true): PermissionPort & { request: jest.Mock } => ({
  name,
  isGranted: jest.fn().mockResolvedValue(granted),
  request: asked instanceof Error ? jest.fn().mockRejectedValue(asked) : jest.fn().mockResolvedValue(asked)
})

describe('askStartupPermissions', () => {
  it('pede só o que ainda não foi concedido, uma de cada vez e na ordem', async () => {
    const order: string[] = []
    const a = port('notificações', true)
    const b = port('microfone', false)
    const c = port('câmera', false)
    b.request.mockImplementation(async () => (order.push('microfone'), true))
    c.request.mockImplementation(async () => (order.push('câmera'), true))
    expect(await askStartupPermissions([a, b, c], 'android')).toEqual([])
    expect(a.request).not.toHaveBeenCalled()
    expect(order).toEqual(['microfone', 'câmera'])
  })

  it('negar não trava as outras e volta a lista do que foi negado', async () => {
    const a = port('notificações', false, false)
    const b = port('microfone', false, true)
    expect(await askStartupPermissions([a, b], 'android')).toEqual(['notificações'])
    expect(b.request).toHaveBeenCalled()
  })

  it('erro do sistema numa permissão conta como negada e segue para a próxima', async () => {
    const a = port('microfone', false, new Error('sem atividade'))
    const b = port('câmera', false, true)
    expect(await askStartupPermissions([a, b], 'android')).toEqual(['microfone'])
    expect(b.request).toHaveBeenCalled()
  })

  it('fora do Android não pergunta nada', async () => {
    const a = port('microfone', false)
    expect(await askStartupPermissions([a], 'ios')).toEqual([])
    expect(a.isGranted).not.toHaveBeenCalled()
  })

  it('a lista do app pede notificações, microfone e câmera, nessa ordem', () => {
    expect(STARTUP_PERMISSIONS.map((p) => p.name)).toEqual(['notificações', 'microfone', 'câmera'])
  })
})

describe('permissões reais (Android)', () => {
  const { PermissionsAndroid, Platform } = jest.requireActual('react-native')
  const notifications = jest.requireMock('expo-notifications')

  beforeEach(() => {
    Platform.OS = 'android'
  })

  it('microfone e câmera passam pelo PermissionsAndroid', async () => {
    const check = jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false)
    const request = jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue('granted')
    const [, mic, camera] = STARTUP_PERMISSIONS
    expect(await mic.isGranted()).toBe(false)
    expect(await mic.request()).toBe(true)
    expect(request).toHaveBeenLastCalledWith('android.permission.RECORD_AUDIO')
    request.mockResolvedValue('denied')
    expect(await camera.request()).toBe(false)
    expect(request).toHaveBeenLastCalledWith('android.permission.CAMERA')
    check.mockRestore()
    request.mockRestore()
  })

  it('notificações passam pelo expo-notifications', async () => {
    const [notif] = STARTUP_PERMISSIONS
    notifications.getPermissionsAsync.mockResolvedValueOnce({ granted: false })
    expect(await notif.isGranted()).toBe(false)
    notifications.requestPermissionsAsync.mockResolvedValueOnce({ granted: true })
    expect(await notif.request()).toBe(true)
  })
})
