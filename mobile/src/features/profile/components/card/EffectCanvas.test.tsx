import { act, render, screen } from '@testing-library/react-native'
import { useIsFocused } from 'expo-router'
import { EffectCanvas } from './EffectCanvas'
import { EffectsFocusProvider } from '../EffectsFocus'
import { useAppActive, useReduceMotion } from '../../hooks/pauseSignals'
import { useEffectPicture } from '../../hooks/useEffectPicture'

jest.mock('expo-router', () => ({ useIsFocused: jest.fn() }))
jest.mock('../../hooks/pauseSignals', () => ({ useAppActive: jest.fn(), useReduceMotion: jest.fn() }))
jest.mock('../../hooks/useEffectPicture', () => ({ useEffectPicture: jest.fn() }))

const PARAMS = { density: 1, speed: 1, color: '#ff7a1a' }
const picture = { value: {} }

function setSignals({ focused = true, active = true, reduce = false } = {}): void {
  jest.mocked(useIsFocused).mockReturnValue(focused)
  jest.mocked(useAppActive).mockReturnValue(active)
  jest.mocked(useReduceMotion).mockReturnValue(reduce)
}

const mount = () =>
  render(
    <EffectsFocusProvider>
      <EffectCanvas effect="fire" params={PARAMS} width={300} height={200} />
    </EffectsFocusProvider>
  )
const modeOf = (): unknown => jest.mocked(useEffectPicture).mock.calls.at(-1)?.[4]

describe('EffectCanvas', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(useEffectPicture).mockReturnValue(picture as never)
    setSignals()
  })

  it('anima quando a tela está em foco, o app em primeiro plano e o sistema não pede menos movimento', async () => {
    await mount()
    expect(modeOf()).toBe('run')
    expect(jest.mocked(useEffectPicture)).toHaveBeenCalledWith('fire', PARAMS, 300, 200, 'run')
    expect(screen.getByTestId('card-effect')).toBeOnTheScreen()
  })

  it('pausa com o app em segundo plano ou com outra tela por cima', async () => {
    setSignals({ active: false })
    const { rerender } = await mount()
    expect(modeOf()).toBe('pause')
    setSignals({ focused: false })
    await rerender(
      <EffectsFocusProvider>
        <EffectCanvas effect="fire" params={PARAMS} width={300} height={200} />
      </EffectsFocusProvider>
    )
    expect(modeOf()).toBe('pause')
  })

  it('"reduzir movimento" desenha um quadro parado e ganha da pausa', async () => {
    setSignals({ reduce: true })
    await mount()
    expect(modeOf()).toBe('still')
  })

  it('sem picture (efeito inexistente ou cartão sem tamanho): não monta canvas', async () => {
    jest.mocked(useEffectPicture).mockReturnValue(null)
    await mount()
    expect(screen.queryByTestId('card-effect')).toBeNull()
  })

  it('o canvas não captura toques nem aparece para o leitor de tela', async () => {
    await mount()
    const canvas = screen.getByTestId('card-effect')
    expect(canvas.props.pointerEvents).toBe('none')
    expect(canvas.props.accessible).toBe(false)
  })

  it('volta a animar quando o app volta ao primeiro plano', async () => {
    setSignals({ active: false })
    const { rerender } = await mount()
    expect(modeOf()).toBe('pause')
    setSignals({ active: true })
    await act(async () => {
      await rerender(
        <EffectsFocusProvider>
          <EffectCanvas effect="fire" params={PARAMS} width={300} height={200} />
        </EffectsFocusProvider>
      )
    })
    expect(modeOf()).toBe('run')
  })
})
