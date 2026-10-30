import { fireEvent, render, screen } from '@testing-library/react-native'
import { useUserAudioStore } from '../store/userAudioStore'
import { UserAudioSheet } from './UserAudioSheet'

jest.mock('react-native-safe-area-context', () => ({ ...jest.requireActual('react-native-safe-area-context'), useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }))

const ana = { id: 'u1', username: 'ana', display_name: 'Ana' }
const audio = () => useUserAudioStore.getState().get('u1')

// Pedido do dono: no app não dava para abaixar nem silenciar o som de outra pessoa da chamada.
describe('UserAudioSheet', () => {
  beforeEach(() => useUserAudioStore.getState().reset())

  it('abaixa e aumenta de 10 em 10% e mostra a porcentagem', async () => {
    await render(<UserAudioSheet user={ana} onClose={jest.fn()} />)
    expect(screen.getByText('100%')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Diminuir volume' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Diminuir volume' }))
    expect(audio().volume).toBe(0.8)
    expect(screen.getByText('80%')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Aumentar volume' }))
    expect(audio().volume).toBe(0.9)
  })

  it('silencia só para mim e desfaz', async () => {
    await render(<UserAudioSheet user={ana} onClose={jest.fn()} />)
    await fireEvent(screen.getByRole('switch', { name: 'Silenciar para mim' }), 'valueChange', true)
    expect(audio().muted).toBe(true)
    expect(screen.getByRole('switch', { name: 'Silenciar para mim' })).toBeChecked()
    await fireEvent(screen.getByRole('switch', { name: 'Silenciar para mim' }), 'valueChange', false)
    expect(audio().muted).toBe(false)
  })

  it('o leitor de tela ajusta o volume pelo controle deslizante', async () => {
    await render(<UserAudioSheet user={ana} onClose={jest.fn()} />)
    const slider = screen.getByRole('adjustable', { name: 'Volume de Ana' })
    await fireEvent(slider, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } })
    expect(audio().volume).toBe(0.9)
    await fireEvent(slider, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } })
    expect(audio().volume).toBe(1)
  })
})
