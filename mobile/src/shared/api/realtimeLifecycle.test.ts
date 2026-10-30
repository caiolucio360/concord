import { bindRealtimeLifecycle } from './realtimeLifecycle'

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
  it('ao voltar do segundo plano (active), retoma a conexão', () => {
    const s = sources()
    const client = makeClient()
    bindRealtimeLifecycle(client, s.appState, s.netInfo)
    s.emitApp('background')
    expect(client.resume).not.toHaveBeenCalled()
    s.emitApp('active')
    expect(client.resume).toHaveBeenCalledTimes(1)
  })

  it('ao ir para segundo plano fora de chamada, suspende na hora (senão o servidor acha que está online e não manda push; os timers do RN param em segundo plano)', () => {
    const s = sources()
    const client = makeClient()
    bindRealtimeLifecycle(client, s.appState, s.netInfo)
    s.emitApp('background')
    expect(client.suspend).toHaveBeenCalledTimes(1)
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
    expect(client.suspend).not.toHaveBeenCalled()
    inCall = false
    changed()
    expect(client.suspend).toHaveBeenCalledTimes(1)
  })

  it('app em primeiro plano nunca suspende, mesmo quando a chamada acaba', () => {
    const s = sources()
    const client = makeClient()
    let changed: () => void = () => {}
    bindRealtimeLifecycle(client, s.appState, s.netInfo, { keepAlive: () => false, onKeepAliveChange: (l) => ((changed = l), () => {}) })
    changed()
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
