import { act, renderHook } from '@testing-library/react-native'
import { CANVAS_EFFECTS } from '../lib/effects'
import type { EffectParams } from '../lib/effects/types'
import { Skia } from '@shopify/react-native-skia'
import { useEffectPicture, type EffectMode } from './useEffectPicture'

const PARAMS: EffectParams = { density: 1, speed: 1, color: '#ff7a1a' }

/** rAF manual: `frame(t)` roda o callback pendente no tempo t. */
function fakeRaf() {
  let cb: ((t: number) => void) | null = null
  let id = 0
  return {
    raf: (fn: (t: number) => void) => {
      cb = fn
      return ++id
    },
    caf: jest.fn(() => {
      cb = null
    }),
    frame: (t: number) => {
      const fn = cb
      cb = null
      fn?.(t)
    },
    pending: () => cb !== null
  }
}

function setup(effect = 'fire', width = 300, height = 200, mode: EffectMode = 'run', params: EffectParams = PARAMS) {
  const r = fakeRaf()
  const hook = renderHook(
    (p: { effect: string; width: number; height: number; mode: EffectMode }) =>
      useEffectPicture(p.effect, params, p.width, p.height, p.mode, { raf: r.raf, caf: r.caf }),
    { initialProps: { effect, width, height, mode } }
  )
  return { r, hook }
}

describe('useEffectPicture', () => {
  afterEach(() => jest.restoreAllMocks())

  it.each([
    ['none', 300, 200],
    ['fogos', 300, 200],
    ['fire', 0, 200],
    ['fire', 300, 0],
    ['fire', -5, 200]
  ])('efeito %s com %d×%d: não cria nada (Review Focus 2 e 4)', async (effect, w, h) => {
    const { r, hook } = setup(effect, w, h)
    expect((await hook).result.current).toBeNull()
    expect(r.pending()).toBe(false)
  })

  it('efeito válido: devolve a picture e anima, uma gravação por quadro', async () => {
    const { r, hook } = setup()
    const { result } = await hook
    expect(result.current).not.toBeNull()
    const record = jest.spyOn(Skia, 'PictureRecorder')
    await act(async () => r.frame(0))
    await act(async () => r.frame(40))
    expect(record).toHaveBeenCalledTimes(2)
    expect(result.current?.value).toEqual({ recorded: true })
  })

  it('pausa (app em segundo plano ou tela sem foco): não agenda quadro; ao voltar, retoma', async () => {
    const { r, hook } = setup('fire', 300, 200, 'pause')
    const { rerender } = await hook
    expect(r.pending()).toBe(false)
    await rerender({ effect: 'fire', width: 300, height: 200, mode: 'run' })
    expect(r.pending()).toBe(true)
    await rerender({ effect: 'fire', width: 300, height: 200, mode: 'pause' })
    expect(r.pending()).toBe(false)
    expect(r.caf).toHaveBeenCalled()
  })

  it('"reduzir movimento": desenha um quadro só e não agenda mais nenhum', async () => {
    const record = jest.spyOn(Skia, 'PictureRecorder')
    const { r, hook } = setup('fire', 300, 200, 'still')
    await hook
    // 1 gravação da picture vazia inicial + 1 do quadro parado.
    expect(record).toHaveBeenCalledTimes(2)
    expect(r.pending()).toBe(false)
  })

  it('desmontar cancela o quadro pendente (nada fica rodando)', async () => {
    const { r, hook } = setup()
    const { unmount } = await hook
    expect(r.pending()).toBe(true)
    await unmount()
    expect(r.pending()).toBe(false)
  })

  it('mudar o tamanho recria a cena no tamanho novo', async () => {
    const init = jest.spyOn(CANVAS_EFFECTS.fire, 'init')
    const { hook } = setup('fire', 300, 200)
    const { rerender } = await hook
    expect(init).toHaveBeenCalledTimes(1)
    await rerender({ effect: 'fire', width: 280, height: 520, mode: 'run' })
    expect(init).toHaveBeenCalledTimes(2)
    expect(init.mock.calls[1].slice(0, 2)).toEqual([280, 520])
  })

  // Review Focus 5: falha do Skia ao gravar um quadro.
  it('erro ao gravar um quadro não derruba o hook e o laço continua', async () => {
    const { r, hook } = setup()
    const { result } = await hook
    const record = jest.spyOn(Skia, 'PictureRecorder')
    record.mockImplementationOnce(() => {
      throw new Error('skia fora')
    })
    await act(async () => r.frame(0))
    expect(r.pending()).toBe(true)
    await act(async () => r.frame(40))
    expect(record).toHaveBeenCalledTimes(2)
    expect(result.current).not.toBeNull()
  })
})
