import { useUserAudioStore } from './userAudioStore'

const store = () => useUserAudioStore.getState()

describe('userAudioStore', () => {
  beforeEach(() => store().reset())

  it('quem não foi ajustado fica em 100% e com som', () => {
    expect(store().get('u1')).toEqual({ volume: 1, muted: false })
  })

  it('abaixar e silenciar valem só para a pessoa escolhida', () => {
    store().setVolume('u1', 0.4)
    store().toggleMuted('u1')
    expect(store().get('u1')).toEqual({ volume: 0.4, muted: true })
    expect(store().get('u2')).toEqual({ volume: 1, muted: false })
    store().toggleMuted('u1')
    expect(store().get('u1').muted).toBe(false)
  })

  it('volume fora da faixa fica entre 0 e 100%', () => {
    store().setVolume('u1', 3)
    expect(store().get('u1').volume).toBe(1)
    store().setVolume('u1', -1)
    expect(store().get('u1').volume).toBe(0)
  })
})
