import { fireEvent, render, screen } from '@testing-library/react-native'
import type { ProfileTheme } from '../../lib/profileTheme'
import type { ProfileData } from '../../lib/profileTypes'
import { useEffectPicture } from '../../skia/useEffectPicture'
import { ProfileCard } from './ProfileCard'

jest.mock('../../skia/useEffectPicture', () => ({ useEffectPicture: jest.fn() }))

const card = (theme?: Partial<ProfileTheme>): ProfileData => ({ id: 'u1', username: 'ana', display_name: 'Ana', profile_theme: theme })
const layout = (width: number, height: number) =>
  fireEvent(screen.getByTestId('profile-card'), 'layout', { nativeEvent: { layout: { width, height } } })
const frame = () => screen.queryByTestId('card-frame')
const effect = () => screen.queryByTestId('card-effect')

describe('ProfileCard: fundo, borda e efeito do tema (Skia)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(useEffectPicture).mockReturnValue({ value: {} } as never)
  })

  it('tema padrão: nenhum canvas, nem depois de medir', async () => {
    await render(<ProfileCard profile={card()} />)
    await layout(300, 500)
    expect(frame()).toBeNull()
    expect(effect()).toBeNull()
  })

  it('degradê: o quadro só aparece depois de medir e assume o fundo e a borda', async () => {
    await render(<ProfileCard profile={card({ background: 'gradient', background_colors: ['#1e1b4b', '#0b1020'] })} />)
    expect(frame()).toBeNull()
    await layout(300, 500)
    expect(frame()).toBeOnTheScreen()
    expect(screen.getByTestId('profile-card')).toHaveStyle({ backgroundColor: 'transparent', borderWidth: 0 })
  })

  it('borda em degradê com fundo sólido: o fundo continua sendo o do React Native', async () => {
    const theme = { background: 'solid', background_colors: ['#112233'], border: 'gradient', border_colors: ['#111111', '#222222'] }
    await render(<ProfileCard profile={card(theme)} />)
    await layout(300, 500)
    expect(frame()).toBeOnTheScreen()
    expect(screen.getByTestId('profile-card')).toHaveStyle({ backgroundColor: '#112233', borderWidth: 0 })
  })

  it('cor sólida e neon seguem nos estilos do React Native, sem canvas', async () => {
    const theme = { background: 'solid', background_colors: ['#1e1b4b'], border: 'neon', border_colors: ['#ec4899'], border_width: 3 }
    await render(<ProfileCard profile={card(theme)} />)
    await layout(300, 500)
    expect(frame()).toBeNull()
    expect(screen.getByTestId('profile-card')).toHaveStyle({ backgroundColor: '#1e1b4b', borderColor: '#ec4899', borderWidth: 3 })
  })

  it('efeito: só monta depois de medir e acompanha o tamanho novo (teclado, rotação)', async () => {
    await render(<ProfileCard profile={card({ effect: 'fire' })} />)
    expect(effect()).toBeNull()
    expect(useEffectPicture).not.toHaveBeenCalled()
    await layout(300, 500)
    expect(effect()).toBeOnTheScreen()
    expect(jest.mocked(useEffectPicture).mock.calls.at(-1)).toEqual(['fire', expect.objectContaining({ color: '#ff7a1a' }), 300, 500, 'run'])
    await layout(280, 520)
    expect(jest.mocked(useEffectPicture).mock.calls.at(-1)?.slice(2, 4)).toEqual([280, 520])
  })

  it.each(['none', 'fogos', 'toString'])('efeito "%s": nenhum canvas', async (id) => {
    await render(<ProfileCard profile={card({ effect: id })} />)
    await layout(300, 500)
    expect(effect()).toBeNull()
    expect(useEffectPicture).not.toHaveBeenCalled()
  })

  it('quadro atrás do conteúdo e efeito por cima de tudo', async () => {
    await render(<ProfileCard profile={card({ background: 'pride', effect: 'rain' })} />)
    await layout(300, 500)
    const children = screen.getByTestId('profile-card').children as { props: { testID?: string } }[]
    expect(children[0].props.testID).toBe('card-frame')
    expect(children[children.length - 1].props.testID).toBe('card-effect')
  })

  it('medir de novo com o mesmo tamanho não refaz nada', async () => {
    await render(<ProfileCard profile={card({ effect: 'snow' })} />)
    await layout(300, 500)
    const calls = jest.mocked(useEffectPicture).mock.calls.length
    await layout(300, 500)
    expect(jest.mocked(useEffectPicture).mock.calls.length).toBe(calls)
  })
})
