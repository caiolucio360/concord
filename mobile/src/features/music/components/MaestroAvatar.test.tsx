import { render, screen } from '@testing-library/react-native'
import { MaestroAvatar } from './MaestroAvatar'

describe('MaestroAvatar', () => {
  it('mostra o GIF do Maestro, redondo, no tamanho pedido', async () => {
    await render(<MaestroAvatar size={48} />)
    const img = screen.getByLabelText('Maestro')
    expect(img.props.source).toBeDefined()
    expect(img).toHaveStyle({ width: 48, height: 48, borderRadius: 24 })
  })
})
