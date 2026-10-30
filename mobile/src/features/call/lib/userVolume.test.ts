import { outputVolume, stepVolume, volumePercent } from './userVolume'

describe('userVolume', () => {
  it('silenciado sai em 0; sem ajuste sai em 100%', () => {
    expect(outputVolume({ volume: 0.6, muted: true })).toBe(0)
    expect(outputVolume(undefined)).toBe(1)
    expect(outputVolume({ volume: 0.6, muted: false })).toBe(0.6)
  })

  it('anda de 10 em 10%, sem passar de 0 a 100%', () => {
    expect(stepVolume(1, 1)).toBe(1)
    expect(stepVolume(1, -1)).toBe(0.9)
    expect(stepVolume(0.1, -1)).toBe(0)
    expect(stepVolume(0, -1)).toBe(0)
    expect(stepVolume(0.3, 1)).toBe(0.4)
  })

  it('mostra o volume em porcentagem inteira', () => {
    expect(volumePercent(0.7)).toBe('70%')
    expect(volumePercent(1)).toBe('100%')
  })
})
