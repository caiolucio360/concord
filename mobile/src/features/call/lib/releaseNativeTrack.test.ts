import { createNativeTracks, releaseNativeTrack } from './releaseNativeTrack'

describe('releaseNativeTrack', () => {
  it('chama release() da faixa nativa, no próprio objeto', () => {
    const track = { release: jest.fn(function (this: unknown) { return this }) }
    releaseNativeTrack(track)
    expect(track.release).toHaveBeenCalledTimes(1)
    expect(track.release.mock.contexts[0]).toBe(track)
  })

  it('faixa ausente ou sem release (navegador/teste) não faz nada', () => {
    expect(() => releaseNativeTrack(undefined)).not.toThrow()
    expect(() => releaseNativeTrack(null)).not.toThrow()
    expect(() => releaseNativeTrack({})).not.toThrow()
  })

  it('erro do módulo nativo não derruba quem está saindo da chamada', () => {
    expect(() => releaseNativeTrack({ release: () => { throw new Error('nativo') } })).not.toThrow()
  })
})

// Regressão: derrubado pelo servidor (outro aparelho da mesma conta) no meio de uma transmissão, o LiveKit já tinha
// limpado as publicações; o app não achava a faixa para liberar e o serviço de captura de tela ficava preso.
describe('createNativeTracks', () => {
  const track = () => ({ release: jest.fn() })

  it('guarda as faixas publicadas e libera todas as que sobraram ao sair', () => {
    const tracks = createNativeTracks()
    const screen = track()
    const camera = track()
    tracks.keep(screen)
    tracks.keep(camera)
    tracks.releaseAll()
    expect(screen.release).toHaveBeenCalledTimes(1)
    expect(camera.release).toHaveBeenCalledTimes(1)
    tracks.releaseAll()
    expect(screen.release).toHaveBeenCalledTimes(1)
  })

  it('liberar uma faixa só tira ela (e não libera de novo no fim)', () => {
    const tracks = createNativeTracks()
    const screen = track()
    const camera = track()
    tracks.keep(screen)
    tracks.keep(camera)
    tracks.release(screen)
    tracks.releaseAll()
    expect(screen.release).toHaveBeenCalledTimes(1)
    expect(camera.release).toHaveBeenCalledTimes(1)
  })

  it('faixa ausente é ignorada', () => {
    const tracks = createNativeTracks()
    tracks.keep(undefined)
    expect(() => tracks.releaseAll()).not.toThrow()
  })
})
