import { act, render, renderHook, screen } from '@testing-library/react-native'
import { useIsFocused } from 'expo-router'
import { AccessibilityInfo, AppState, Text } from 'react-native'
import { EffectsFocusProvider, useEffectsFocused } from './EffectsFocus'
import { useAppActive, useReduceMotion } from './pauseSignals'

jest.mock('expo-router', () => ({ useIsFocused: jest.fn() }))

describe('useAppActive', () => {
  afterEach(() => jest.restoreAllMocks())

  it('segue o estado do app e solta o ouvinte ao desmontar', async () => {
    let handler: (s: string) => void = () => {}
    const remove = jest.fn()
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, h: (s: string) => void) => {
      handler = h
      return { remove }
    }) as never)
    Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true })
    const { result, unmount } = await renderHook(() => useAppActive())
    expect(result.current).toBe(true)
    await act(async () => handler('background'))
    expect(result.current).toBe(false)
    await act(async () => handler('active'))
    expect(result.current).toBe(true)
    await unmount()
    expect(remove).toHaveBeenCalled()
  })
})

describe('useReduceMotion', () => {
  afterEach(() => jest.restoreAllMocks())

  it('lê o ajuste do sistema, acompanha a mudança e solta o ouvinte', async () => {
    let handler: (v: boolean) => void = () => {}
    const remove = jest.fn()
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true)
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(((_: string, h: (v: boolean) => void) => {
      handler = h
      return { remove }
    }) as never)
    const { result, unmount } = await renderHook(() => useReduceMotion())
    await act(async () => {})
    expect(result.current).toBe(true)
    await act(async () => handler(false))
    expect(result.current).toBe(false)
    await unmount()
    expect(remove).toHaveBeenCalled()
  })

  it('sem resposta do sistema: movimento normal', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockRejectedValue(new Error('x'))
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({ remove: jest.fn() } as never)
    const { result } = await renderHook(() => useReduceMotion())
    await act(async () => {})
    expect(result.current).toBe(false)
  })
})

describe('EffectsFocus', () => {
  function Probe() {
    return <Text>{useEffectsFocused() ? 'em foco' : 'sem foco'}</Text>
  }

  it('fora de uma rota (testes, telas soltas) vale "em foco"', async () => {
    await render(<Probe />)
    expect(screen.getByText('em foco')).toBeOnTheScreen()
  })

  it('dentro de uma rota segue o foco da tela', async () => {
    jest.mocked(useIsFocused).mockReturnValue(false)
    const { rerender } = await render(
      <EffectsFocusProvider>
        <Probe />
      </EffectsFocusProvider>
    )
    expect(screen.getByText('sem foco')).toBeOnTheScreen()
    jest.mocked(useIsFocused).mockReturnValue(true)
    await rerender(
      <EffectsFocusProvider>
        <Probe />
      </EffectsFocusProvider>
    )
    expect(screen.getByText('em foco')).toBeOnTheScreen()
  })
})
