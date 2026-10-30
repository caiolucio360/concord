import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { useVoiceControlsStore } from '../../voice/store/voiceControlsStore'
import { CallControls } from './CallControls'

beforeEach(() => useVoiceControlsStore.setState({ muted: false, deafened: false }))

describe('CallControls (barra redonda da chamada)', () => {
  it('microfone, fone, compartilhar tela e sair, todos com nome para o leitor de tela', async () => {
    await render(<CallControls sharing={false} onToggleShare={jest.fn()} onLeave={jest.fn()} />)
    for (const name of ['Silenciar microfone', 'Ensurdecer', 'Compartilhar tela', 'Sair da chamada']) {
      expect(screen.getByRole('button', { name })).toBeOnTheScreen()
    }
  })

  it('sair e compartilhar chamam os tratadores; transmitindo vira "Parar de compartilhar a tela"', async () => {
    const onLeave = jest.fn()
    const onToggleShare = jest.fn()
    const { rerender } = await render(<CallControls sharing={false} onToggleShare={onToggleShare} onLeave={onLeave} />)
    await fireEvent.press(screen.getByRole('button', { name: 'Compartilhar tela' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Sair da chamada' }))
    expect(onToggleShare).toHaveBeenCalledTimes(1)
    expect(onLeave).toHaveBeenCalledTimes(1)
    await rerender(<CallControls sharing onToggleShare={onToggleShare} onLeave={onLeave} />)
    expect(screen.getByRole('button', { name: 'Parar de compartilhar a tela' })).toBeOnTheScreen()
  })

  it('mudo e ensurdecido mudam o nome e o estado do botão', async () => {
    await render(<CallControls sharing={false} onLeave={jest.fn()} />)
    await act(async () => useVoiceControlsStore.setState({ muted: true }))
    expect(screen.getByRole('button', { name: 'Ativar microfone' })).toBeOnTheScreen()
    await act(async () => useVoiceControlsStore.setState({ deafened: true }))
    expect(screen.getByRole('button', { name: 'Desensurdecer' })).toBeOnTheScreen()
  })

  it('sem como compartilhar (não injetado) o botão não aparece', async () => {
    await render(<CallControls sharing={false} onLeave={jest.fn()} />)
    expect(screen.queryByRole('button', { name: 'Compartilhar tela' })).toBeNull()
  })
})
