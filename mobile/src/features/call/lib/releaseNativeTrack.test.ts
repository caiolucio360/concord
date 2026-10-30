import { releaseNativeTrack } from './releaseNativeTrack'

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
