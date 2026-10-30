import { describe, expect, it, vi } from 'vitest'
import { createLivePip, pipButtonLabel, pipSupported, type PipVideo } from './livePip'

const stream = (id: string): MediaStream => ({ id }) as unknown as MediaStream

function fakeVideo(opts: { failPip?: boolean } = {}) {
  const listeners: (() => void)[] = []
  const video = {
    srcObject: null as MediaProvider | null,
    play: vi.fn(async () => {}),
    requestPictureInPicture: vi.fn(async () => {
      if (opts.failPip) throw new Error('NotAllowedError')
    }),
    addEventListener: vi.fn((_: 'leavepictureinpicture', fn: () => void) => listeners.push(fn)),
    remove: vi.fn(),
    /** Simula o X da janela flutuante (ou o navegador fechando o PiP). */
    leave: () => listeners.forEach((fn) => fn())
  }
  return video
}

function setup(opts: { failPip?: boolean } = {}) {
  const streams: Record<string, MediaStream> = { bia: stream('s-bia'), caio: stream('s-caio') }
  const videos: ReturnType<typeof fakeVideo>[] = []
  let onStreams: (() => void) | null = null
  const active = vi.fn()
  const exit = vi.fn(async () => videos.at(-1)?.leave())
  const stopWatch = vi.fn(() => {
    onStreams = null
  })
  const pip = createLivePip({
    createVideo: () => {
      const v = fakeVideo(opts)
      videos.push(v)
      return v as unknown as PipVideo
    },
    exit,
    streamOf: (userId) => streams[userId] ?? null,
    watchStreams: (fn) => {
      onStreams = fn
      return stopWatch
    },
    setActive: active
  })
  const changeStreams = (next: Record<string, MediaStream>): void => {
    for (const k of Object.keys(streams)) delete streams[k]
    Object.assign(streams, next)
    onStreams?.()
  }
  return { pip, streams, videos, active, exit, stopWatch, changeStreams }
}

describe('createLivePip', () => {
  it('abre a live num <video> próprio, toca e pede a janela flutuante', async () => {
    const { pip, videos, active } = setup()
    expect(await pip.open('bia')).toBe(true)
    expect(videos).toHaveLength(1)
    expect(videos[0].srcObject).toEqual(stream('s-bia'))
    expect(videos[0].play).toHaveBeenCalled()
    expect(videos[0].requestPictureInPicture).toHaveBeenCalled()
    expect(active).toHaveBeenLastCalledWith('bia')
    expect(pip.current()).toBe('bia')
  })

  it('sem a live (não estou assistindo) não abre nada', async () => {
    const { pip, videos, active } = setup()
    expect(await pip.open('ninguem')).toBe(false)
    expect(videos).toHaveLength(0)
    expect(active).not.toHaveBeenCalled()
  })

  it('navegador recusou o PiP: limpa o <video> e não marca nada', async () => {
    const { pip, videos, active } = setup({ failPip: true })
    expect(await pip.open('bia')).toBe(false)
    expect(videos[0].remove).toHaveBeenCalled()
    expect(videos[0].srcObject).toBe(null)
    expect(active).not.toHaveBeenCalled()
    expect(pip.current()).toBe(null)
  })

  it('fechar pela janela (X do PiP) limpa tudo e para de seguir a live', async () => {
    const { pip, videos, active, stopWatch } = setup()
    await pip.open('bia')
    videos[0].leave()
    expect(active).toHaveBeenLastCalledWith(null)
    expect(videos[0].remove).toHaveBeenCalled()
    expect(stopWatch).toHaveBeenCalled()
    expect(pip.current()).toBe(null)
  })

  it('toggle: segundo clique na mesma live sai da janela flutuante', async () => {
    const { pip, exit, active } = setup()
    await pip.toggle('bia')
    await pip.toggle('bia')
    expect(exit).toHaveBeenCalledTimes(1)
    expect(active).toHaveBeenLastCalledWith(null)
  })

  it('outra live com a janela aberta: troca o vídeo na mesma janela', async () => {
    const { pip, videos, active } = setup()
    await pip.open('bia')
    expect(await pip.toggle('caio')).toBe(true)
    expect(videos).toHaveLength(1)
    expect(videos[0].srcObject).toEqual(stream('s-caio'))
    expect(active).toHaveBeenLastCalledWith('caio')
  })

  it('a live trocou de stream (reconexão): o <video> segue o novo', async () => {
    const { pip, videos, changeStreams } = setup()
    await pip.open('bia')
    const next = stream('s-bia-2')
    changeStreams({ bia: next })
    expect(videos[0].srcObject).toBe(next)
    expect(videos[0].play).toHaveBeenCalledTimes(2)
  })

  it('a live acabou (parou, deixei de assistir, saí da chamada): fecha a janela', async () => {
    const { pip, exit, active, changeStreams } = setup()
    await pip.open('bia')
    changeStreams({ caio: stream('s-caio') })
    expect(exit).toHaveBeenCalled()
    await Promise.resolve()
    expect(active).toHaveBeenLastCalledWith(null)
  })

  it('dois cliques rápidos não abrem duas janelas', async () => {
    const { pip, videos } = setup()
    await Promise.all([pip.open('bia'), pip.open('bia')])
    expect(videos).toHaveLength(1)
  })

  it('fechar sem nada aberto não faz nada', async () => {
    const { pip, exit } = setup()
    await pip.close()
    expect(exit).not.toHaveBeenCalled()
  })

  it('sair falhou (janela já fechada): limpa assim mesmo', async () => {
    const { pip, exit, active } = setup()
    await pip.open('bia')
    exit.mockRejectedValueOnce(new Error('InvalidStateError'))
    await pip.close()
    expect(active).toHaveBeenLastCalledWith(null)
    expect(pip.current()).toBe(null)
  })
})

describe('pipSupported', () => {
  it('só com a API ligada (Firefox não tem; Electron e Chrome sim)', () => {
    expect(pipSupported({ pictureInPictureEnabled: true })).toBe(true)
    expect(pipSupported({ pictureInPictureEnabled: false })).toBe(false)
    expect(pipSupported({})).toBe(false)
  })
})

describe('pipButtonLabel', () => {
  it('diz o que o clique faz', () => {
    expect(pipButtonLabel(false)).toBe('Janela flutuante')
    expect(pipButtonLabel(true)).toBe('Sair da janela flutuante')
  })
})
