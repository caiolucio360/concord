import { BACKGROUND_GRACE_MS, bindRealtimeLifecycle } from './realtimeLifecycle'

function sources() {
  let appHandler: (state: string) => void = () => {}
  let netHandler: (state: { isConnected: boolean | null }) => void = () => {}
  const removeApp = jest.fn()
  const removeNet = jest.fn()
  return {
    appState: { addEventListener: (_: 'change', h: typeof appHandler) => ((appHandler = h), { remove: removeApp }) },
    netInfo: { addEventListener: (h: typeof netHandler) => ((netHandler = h), removeNet) },
    emitApp: (s: string) => appHandler(s),
    emitNet: (c: boolean | null) => netHandler({ isConnected: c }),
    removeApp,
    removeNet
  }
}

const makeClient = () => ({ retryNow: jest.fn(), suspend: jest.fn(), resume: jest.fn() })

describe('bindRealtimeLifecycle', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('ao voltar do segundo plano (active), retoma a conexão', () => {
    const s = sources()
    const client = makeClient()
    bindRealtimeLifecycle(client, s.appState, s.netInfo)
    s.emitApp('background')
    expect(client.resume).not.toHaveBeenCalled()
    s.emitApp('active')
    expect(client.resume).toHaveBeenCalledTimes(1)
  })

  it('em segundo plano por mais que a tolerância, suspende a conexão (senão o servidor acha que está online e não manda push)', () => {
    const s = sources()
    const client = makeClient()
    bindRealtimeLifecycle(client, s.appState, s.netInfo)
    s.emitApp('background')
    jest.advanceTimersByTime(BACKGROUND_GRACE_MS - 1)
    expect(client.suspend).not.toHaveBeenCalled()
    jest.advanceTimersByTime(1)
    expect(client.suspend).toHaveBeenCalledTimes(1)
  })

  it('voltar antes da tolerância cancela a suspensão', () => {
    const s = sources()
    const client = makeClient()
    bindRealtimeLifecycle(client, s.appState, s.netInfo)
    s.emitApp('background')
    jest.advanceTimersByTime(BACKGROUND_GRACE_MS - 1000)
    s.emitApp('active')
    jest.advanceTimersByTime(BACKGROUND_GRACE_MS)
    expect(client.suspend).not.toHaveBeenCalled()
  })

  it('em chamada a conexão continua; ao acabar a chamada com o app em segundo plano, suspende', () => {
    const s = sources()
    const client = makeClient()
    let inCall = true
    let changed: () => void = () => {}
    bindRealtimeLifecycle(client, s.appState, s.netInfo, {
      keepAlive: () => inCall,
      onKeepAliveChange: (l) => ((changed = l), () => {})
    })
    s.emitApp('background')
    jest.advanceTimersByTime(BACKGROUND_GRACE_MS * 2)
    expect(client.suspend).not.toHaveBeenCalled()
    inCall = false
    changed()
    jest.advanceTimersByTime(BACKGROUND_GRACE_MS)
    expect(client.suspend).toHaveBeenCalledTimes(1)
  })

  it('app em primeiro plano nunca suspende, mesmo quando a chamada acaba', () => {
    const s = sources()
    const client = makeClient()
    let changed: () => void = () => {}
    bindRealtimeLifecycle(client, s.appState, s.netInfo, { keepAlive: () => false, onKeepAliveChange: (l) => ((changed = l), () => {}) })
    changed()
    jest.advanceTimersByTime(BACKGROUND_GRACE_MS * 2)
    expect(client.suspend).not.toHaveBeenCalled()
  })

  it('ao voltar a rede, tenta reconectar agora; sem rede, não', () => {
    const s = sources()
    const client = makeClient()
    bindRealtimeLifecycle(client, s.appState, s.netInfo)
    s.emitNet(false)
    s.emitNet(null)
    expect(client.retryNow).not.toHaveBeenCalled()
    s.emitNet(true)
    expect(client.retryNow).toHaveBeenCalledTimes(1)
  })

  it('o desligar remove os dois ouvintes', () => {
    const s = sources()
    const stop = bindRealtimeLifecycle(makeClient(), s.appState, s.netInfo)
    stop()
    expect(s.removeApp).toHaveBeenCalled()
    expect(s.removeNet).toHaveBeenCalled()
  })
})
