import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils'
import { MediaLightbox } from './MediaLightbox'

const open = (onClose = jest.fn()) => render(<MediaLightbox src="file://foto.png" label="foto.png" width={800} height={600} onClose={onClose} />)
const zoomOut = () => screen.getByRole('button', { name: 'Diminuir zoom' })
const zoomIn = () => screen.getByRole('button', { name: 'Aumentar zoom' })

describe('MediaLightbox', () => {
  it('barra só com os ícones; em 1x o diminuir fica desativado', async () => {
    await open()
    expect(zoomOut()).toBeDisabled()
    expect(zoomIn()).toBeEnabled()
    expect(screen.queryByText(/%$/)).toBeNull()
  })

  it('+ amplia até 5x (aí desativa) e − volta até 1x', async () => {
    await open()
    await fireEvent.press(zoomIn())
    expect(zoomOut()).toBeEnabled()
    // 1,25^8 ≈ 5,96: passa de 5x e para no limite.
    for (let i = 0; i < 8; i++) await fireEvent.press(zoomIn())
    expect(zoomIn()).toBeDisabled()
    for (let i = 0; i < 8; i++) await fireEvent.press(zoomOut())
    expect(zoomOut()).toBeDisabled()
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
    await fireEvent.press(zoomIn())
    fireGestureHandler(getByGestureTestId('lightbox-toque'))
    expect(onClose).not.toHaveBeenCalled()
    await fireEvent.press(screen.getByLabelText('Fechar'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('leitor de tela (TalkBack): ativar a imagem fecha', async () => {
    const onClose = jest.fn()
    await open(onClose)
    await fireEvent(screen.getByLabelText('Fechar imagem'), 'accessibilityAction', { nativeEvent: { actionName: 'activate' } })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('duplo toque amplia e a barra acompanha', async () => {
    await open()
    await act(() => fireGestureHandler(getByGestureTestId('lightbox-duplo-toque')))
    expect(zoomOut()).toBeEnabled()
  })
})
