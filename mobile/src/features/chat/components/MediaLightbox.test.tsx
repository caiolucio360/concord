import { fireEvent, render, screen } from '@testing-library/react-native'
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils'
import { MediaLightbox } from './MediaLightbox'

const open = (onClose = jest.fn()) => render(<MediaLightbox src="file://foto.png" label="foto.png" width={800} height={600} onClose={onClose} />)

describe('MediaLightbox', () => {
  it('abre em 100%, com diminuir e voltar desativados', async () => {
    await open()
    expect(screen.getByText('100%')).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Diminuir zoom' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Voltar ao tamanho original' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Aumentar zoom' })).toBeEnabled()
  })

  it('+ amplia, − reduz e o nível volta para 100%', async () => {
    await open()
    await fireEvent.press(screen.getByRole('button', { name: 'Aumentar zoom' }))
    expect(screen.getByText('125%')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Aumentar zoom' }))
    expect(screen.getByText('156%')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar ao tamanho original' }))
    expect(screen.getByText('100%')).toBeOnTheScreen()
  })

  it('toque simples na imagem em 1x fecha', async () => {
    const onClose = jest.fn()
    await open(onClose)
    fireGestureHandler(getByGestureTestId('lightbox-toque'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ampliada, o toque simples não fecha (só o X)', async () => {
    const onClose = jest.fn()
    await open(onClose)
    await fireEvent.press(screen.getByRole('button', { name: 'Aumentar zoom' }))
    fireGestureHandler(getByGestureTestId('lightbox-toque'))
    expect(onClose).not.toHaveBeenCalled()
    await fireEvent.press(screen.getByLabelText('Fechar'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
