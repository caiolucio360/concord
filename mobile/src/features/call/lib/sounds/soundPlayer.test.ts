import { createSoundPlayer, type SoundHandle } from './soundPlayer'

const handle = (): jest.Mocked<SoundHandle> => ({ seekTo: jest.fn(), play: jest.fn() })

describe('createSoundPlayer', () => {
  it('sintetiza uma vez, volta ao início e toca; o segundo toque reaproveita o player', () => {
    const player = handle()
    const make = jest.fn().mockReturnValue(player)
    const play = createSoundPlayer(make)
    play('mute')
    play('mute')
    expect(make).toHaveBeenCalledTimes(1)
    expect(make).toHaveBeenCalledWith(expect.stringMatching(/^data:audio\/wav;base64,/))
    expect(player.seekTo).toHaveBeenCalledWith(0)
    expect(player.play).toHaveBeenCalledTimes(2)
  })

  it('cada som tem o seu player', () => {
    const make = jest.fn().mockImplementation(handle)
    const play = createSoundPlayer(make)
    play('mute')
    play('unmute')
    expect(make).toHaveBeenCalledTimes(2)
  })

  it('falha do áudio não lança', () => {
    const play = createSoundPlayer(() => {
      throw new Error('sem áudio')
    })
    expect(() => play('join')).not.toThrow()
  })
})
