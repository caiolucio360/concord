import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useWindowActivityStore } from '../../../shared/store/windowActivityStore'
import { useScreenVisibilityStore } from '../store/screenVisibilityStore'
import { useLivePipStore } from '../store/livePipStore'
import {
  OFFSCREEN_PAUSE_MS,
  offscreenLives,
  samePause,
  videoEnabled,
  watchVideoPause,
  type VideoPauseState
} from './screenVideoPause'

const state = (
  windowHidden: boolean,
  offscreen: string[] = [],
  pip: string | null = null
): VideoPauseState => ({
  windowHidden,
  offscreen: new Set(offscreen),
  pip
})

describe('videoEnabled', () => {
  it('janela minimizada ou na bandeja: pausa todo vídeo (tela e câmera)', () => {
    expect(videoEnabled('screen_share', 'bia', state(true))).toBe(false)
    expect(videoEnabled('camera', 'bia', state(true))).toBe(false)
  })

  it('live fora da área visível do app: pausa só o vídeo dessa live', () => {
    const s = state(false, ['bia'])
    expect(videoEnabled('screen_share', 'bia', s)).toBe(false)
    expect(videoEnabled('screen_share', 'caio', s)).toBe(true)
    expect(videoEnabled('camera', 'bia', s)).toBe(true)
  })

  it('visível: toca', () => {
    expect(videoEnabled('screen_share', 'bia', state(false))).toBe(true)
  })

  it('live na janela flutuante: toca mesmo minimizado ou fora de vista; as outras não', () => {
    const s = state(true, ['bia', 'caio'], 'bia')
    expect(videoEnabled('screen_share', 'bia', s)).toBe(true)
    expect(videoEnabled('screen_share', 'caio', s)).toBe(false)
    expect(videoEnabled('camera', 'bia', s)).toBe(false)
  })
})

describe('samePause', () => {
  it('compara janela, lives fora de vista (sem ordem) e a da janela flutuante', () => {
    expect(samePause(state(false, ['a', 'b']), state(false, ['b', 'a']))).toBe(true)
    expect(samePause(state(false), state(true))).toBe(false)
    expect(samePause(state(false, ['a']), state(false, ['b']))).toBe(false)
    expect(samePause(state(false, ['a']), state(false, ['a', 'b']))).toBe(false)
    expect(samePause(state(false, [], 'a'), state(false, [], null))).toBe(false)
  })
})

describe('offscreenLives', () => {
  it('fora de vista só quando todo <video> daquela live está fora', () => {
    expect(
      offscreenLives({
        a: { userId: 'bia', visible: false },
        b: { userId: 'bia', visible: true },
        c: { userId: 'caio', visible: false },
        d: { userId: 'caio', visible: false }
      })
    ).toEqual(['caio'])
    expect(offscreenLives({})).toEqual([])
  })
})

describe('watchVideoPause', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useWindowActivityStore.getState().setActivity({ focused: true, visible: true })
    useScreenVisibilityStore.setState({ elements: {} })
    useLivePipStore.getState().setUserId(null)
  })
  afterEach(() => vi.useRealTimers())

  const offscreenOf = (onChange: ReturnType<typeof vi.fn>): string[] => [
    ...(onChange.mock.lastCall?.[0] as VideoPauseState).offscreen
  ]
  const hiddenOf = (onChange: ReturnType<typeof vi.fn>): boolean =>
    (onChange.mock.lastCall?.[0] as VideoPauseState).windowHidden

  it('avisa já; minimizar pausa na hora; perder o foco (alt-tab, outro monitor) não', () => {
    const onChange = vi.fn()
    const stop = watchVideoPause(onChange)
    expect(hiddenOf(onChange)).toBe(false)
    useWindowActivityStore.getState().setActivity({ focused: false, visible: true })
    expect(onChange).toHaveBeenCalledTimes(1)
    useWindowActivityStore.getState().setActivity({ focused: false, visible: false })
    expect(hiddenOf(onChange)).toBe(true)
    useWindowActivityStore.getState().setActivity({ focused: true, visible: true })
    expect(hiddenOf(onChange)).toBe(false)
    stop()
    useWindowActivityStore.getState().setActivity({ focused: false, visible: false })
    expect(onChange).toHaveBeenCalledTimes(3)
  })

  it('fora de vista pausa depois de um instante (rolagem não pisca); voltar é imediato', () => {
    const onChange = vi.fn()
    const stop = watchVideoPause(onChange)
    const visibility = useScreenVisibilityStore.getState()
    visibility.report('v1', 'bia', true)
    visibility.report('v1', 'bia', false)
    vi.advanceTimersByTime(OFFSCREEN_PAUSE_MS - 1)
    expect(offscreenOf(onChange)).toEqual([])
    visibility.report('v1', 'bia', true)
    vi.advanceTimersByTime(OFFSCREEN_PAUSE_MS)
    expect(offscreenOf(onChange)).toEqual([])
    visibility.report('v1', 'bia', false)
    vi.advanceTimersByTime(OFFSCREEN_PAUSE_MS)
    expect(offscreenOf(onChange)).toEqual(['bia'])
    const calls = onChange.mock.calls.length
    visibility.report('v1', 'bia', true)
    expect(onChange).toHaveBeenCalledTimes(calls + 1)
    expect(offscreenOf(onChange)).toEqual([])
    stop()
  })

  it('o <video> que sumiu deixa de contar; parar cancela a pausa pendente', () => {
    const onChange = vi.fn()
    const stop = watchVideoPause(onChange)
    const visibility = useScreenVisibilityStore.getState()
    visibility.report('v1', 'bia', false)
    visibility.remove('v1')
    vi.advanceTimersByTime(OFFSCREEN_PAUSE_MS)
    expect(offscreenOf(onChange)).toEqual([])
    visibility.report('v2', 'bia', false)
    stop()
    vi.advanceTimersByTime(OFFSCREEN_PAUSE_MS)
    expect(offscreenOf(onChange)).toEqual([])
  })

  it('abrir e fechar a janela flutuante avisa na hora', () => {
    const onChange = vi.fn()
    const stop = watchVideoPause(onChange)
    const pipOf = (): string | null => (onChange.mock.lastCall?.[0] as VideoPauseState).pip
    expect(pipOf()).toBe(null)
    useLivePipStore.getState().setUserId('bia')
    expect(pipOf()).toBe('bia')
    useLivePipStore.getState().setUserId(null)
    expect(pipOf()).toBe(null)
    const calls = onChange.mock.calls.length
    useLivePipStore.getState().setUserId(null)
    expect(onChange).toHaveBeenCalledTimes(calls)
    stop()
    useLivePipStore.getState().setUserId('bia')
    expect(onChange).toHaveBeenCalledTimes(calls)
  })
})
