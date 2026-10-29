import { useScreenShareStore } from './screenShareStore'

const store = () => useScreenShareStore.getState()

describe('screenShareStore', () => {
  beforeEach(() => store().reset())

  it('guarda quem transmite e se eu estou transmitindo', () => {
    store().setSharers(['u1', 'me'])
    store().setSharing(true)
    expect(store()).toMatchObject({ sharers: ['u1', 'me'], sharing: true, watching: null })
  })

  it('assistir uma transmissão que continua no ar mantém; quando ela acaba, a tela de assistir fecha', () => {
    store().setSharers(['u1', 'u2'])
    store().setWatching('u1')
    store().setSharers(['u1'])
    expect(store().watching).toBe('u1')
    store().setSharers(['u2'])
    expect(store().watching).toBeNull()
  })

  it('reset zera tudo', () => {
    store().setSharers(['u1'])
    store().setSharing(true)
    store().setWatching('u1')
    store().reset()
    expect(store()).toMatchObject({ sharers: [], sharing: false, watching: null })
  })
})
