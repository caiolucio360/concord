import { createCallForeground, type ForegroundPort } from './callForeground'

const port = (): jest.Mocked<ForegroundPort> => ({ start: jest.fn().mockResolvedValue(undefined), stop: jest.fn().mockResolvedValue(undefined) })

// Regressão: sem serviço em primeiro plano, ir para outra tela derrubava a chamada (~30 s depois o LiveKit fechava
// a conexão com PEER_CONNECTION_DISCONNECTED e o servidor tirava a pessoa da call).
describe('createCallForeground', () => {
  it('liga o serviço ao entrar na chamada e desliga ao sair', () => {
    const p = port()
    const fg = createCallForeground(p)
    fg.sync({ phase: 'connecting', name: 'voz' })
    expect(p.start).toHaveBeenCalledWith({ title: 'voz' })
    fg.sync({ phase: 'active', name: 'voz' })
    expect(p.start).toHaveBeenCalledTimes(1)
    fg.sync({ phase: 'idle', name: '' })
    expect(p.stop).toHaveBeenCalledTimes(1)
  })

  it('chamando alguém (outgoing) e reconectando também mantêm o serviço', () => {
    const p = port()
    const fg = createCallForeground(p)
    fg.sync({ phase: 'outgoing', name: 'Ana' })
    fg.sync({ phase: 'reconnecting', name: 'Ana' })
    expect(p.start).toHaveBeenCalledTimes(1)
    expect(p.stop).not.toHaveBeenCalled()
  })

  it('tocando para mim (ringing) não liga: ainda não estou na chamada', () => {
    const p = port()
    createCallForeground(p).sync({ phase: 'ringing', name: 'Ana' })
    expect(p.start).not.toHaveBeenCalled()
  })

  it('ocioso desde o começo não desliga nada; falha do sistema não derruba o app', async () => {
    const p = port()
    p.start.mockRejectedValueOnce(new Error('ForegroundServiceStartNotAllowedException'))
    const fg = createCallForeground(p)
    fg.sync({ phase: 'idle', name: '' })
    expect(p.stop).not.toHaveBeenCalled()
    fg.sync({ phase: 'active', name: 'voz' })
    await Promise.resolve()
    expect(p.start).toHaveBeenCalledTimes(1)
  })

  // Regressão: o serviço é do tipo microfone; subir sem a permissão derruba o app no Android 14.
  it('sem permissão de microfone não liga o serviço', () => {
    const p = port()
    createCallForeground(p).sync({ phase: 'active', name: 'voz', micDenied: true })
    expect(p.start).not.toHaveBeenCalled()
  })
})
