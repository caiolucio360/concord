import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { CallAvatar } from './CallAvatar'

const GIF = '/api/profile-media/a_abc123'
const uriOf = (el: { props: Record<string, any> }): string => el.props.source.uri
const opacityOf = (el: { props: Record<string, any> }): number => {
  const flat = ([] as unknown[]).concat(el.props.style as never).filter(Boolean) as { opacity?: number }[]
  return flat.reduce((acc, s) => (s.opacity !== undefined ? s.opacity : acc), 1)
}

// Regressão: a cada começo/fim de fala o avatar trocava entre o quadro parado e o GIF (1,36 MB no caso do dono),
// recarregava e mostrava o fundo cinza enquanto decodificava; como a fala liga e desliga várias vezes por segundo,
// o GIF nunca chegava a animar.
describe('CallAvatar', () => {
  it('em silêncio só o quadro parado; o GIF nem é baixado', async () => {
    await render(<CallAvatar name="Ana" uri={GIF} size={96} speaking={false} />)
    expect(uriOf(screen.getByTestId('avatar-still'))).toMatch(/\/static$/)
    expect(screen.queryByTestId('avatar-animated', { includeHiddenElements: true })).toBeNull()
  })

  it('ao falar o GIF entra por cima do quadro parado e só aparece depois de carregado (sem fundo cinza)', async () => {
    await render(<CallAvatar name="Ana" uri={GIF} size={96} speaking />)
    const animated = screen.getByTestId('avatar-animated', { includeHiddenElements: true })
    expect(uriOf(animated)).not.toMatch(/static/)
    expect(opacityOf(animated)).toBe(0)
    expect(screen.getByTestId('avatar-still')).toBeOnTheScreen()
    await act(async () => fireEvent(animated, 'load'))
    expect(opacityOf(screen.getByTestId('avatar-animated', { includeHiddenElements: true }))).toBe(1)
  })

  it('parar de falar esconde o GIF sem desmontar: voltar a falar não baixa de novo', async () => {
    const { rerender } = await render(<CallAvatar name="Ana" uri={GIF} size={96} speaking />)
    await act(async () => fireEvent(screen.getByTestId('avatar-animated', { includeHiddenElements: true }), 'load'))
    await rerender(<CallAvatar name="Ana" uri={GIF} size={96} speaking={false} />)
    const kept = screen.getByTestId('avatar-animated', { includeHiddenElements: true })
    expect(opacityOf(kept)).toBe(0)
    await rerender(<CallAvatar name="Ana" uri={GIF} size={96} speaking />)
    expect(screen.getByTestId('avatar-animated', { includeHiddenElements: true })).toBe(kept)
    expect(opacityOf(screen.getByTestId('avatar-animated', { includeHiddenElements: true }))).toBe(1)
  })

  it('foto que não anima e pessoa sem foto: só uma imagem (ou a inicial)', async () => {
    await render(<CallAvatar name="Bia" uri="/api/profile-media/xyz" size={96} speaking />)
    expect(screen.queryByTestId('avatar-animated', { includeHiddenElements: true })).toBeNull()
    await render(<CallAvatar name="Caio" uri={null} size={96} speaking />)
    expect(screen.getByText('C')).toBeOnTheScreen()
  })
})
