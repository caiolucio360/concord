import { render, screen } from '@testing-library/react-native'
import { PathIcon } from './PathIcon'
import { CROWN_PATHS, DIAMOND_PATHS, SPARKLE_PATHS } from './icons/hubIcons'

describe('PathIcon', () => {
  it('desenha cada traço do ícone, na cor pedida, numa caixa do tamanho pedido', async () => {
    await render(<PathIcon paths={DIAMOND_PATHS} color="#a78bfa" size={28} label="Diamante" />)
    const icon = screen.getByLabelText('Diamante')
    expect(icon.props.style).toMatchObject({ width: 28, height: 28 })
    expect(screen.getAllByTestId('skia-Path')).toHaveLength(DIAMOND_PATHS.length)
  })

  it('sem rótulo fica escondido do leitor de tela (o nome está no botão)', async () => {
    await render(<PathIcon paths={CROWN_PATHS} color="#fcd34d" testID="coroa" />)
    expect(screen.getByTestId('coroa', { includeHiddenElements: true }).props.accessibilityElementsHidden).toBe(true)
  })

  it('os ícones são os mesmos da web (viewBox 24)', () => {
    expect(DIAMOND_PATHS).toEqual(['M6.6 3h10.8l3.7 5H2.9z', 'M2.4 9.5h19.2L12 21.5z'])
    expect(SPARKLE_PATHS).toHaveLength(2)
    expect(CROWN_PATHS[0]).toBe('M3 7.5 7.5 11 12 4l4.5 7L21 7.5 19.5 18h-15L3 7.5Z')
  })
})
