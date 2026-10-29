import { render, screen, within } from '@testing-library/react-native'
import { cardLook } from '../lib/cardLook'
import { PRIDE_STRIPES } from '../lib/profilePride'
import { CardFrame } from './CardFrame'

const W = 200
const H = 100

// O RoundedRect do Skia não tem testID: o fundo é o que não é traço, a borda é o de style="stroke".
const rects = () => screen.queryAllByTestId('skia-RoundedRect')
const background = () => rects().find((r) => r.props.style !== 'stroke')
const border = () => rects().find((r) => r.props.style === 'stroke')

describe('CardFrame: fundo', () => {
  it('degradê: as duas cores do tema na linha do ângulo (90° = esquerda para direita)', async () => {
    const look = cardLook({ background: 'gradient', background_colors: ['#1e1b4b', '#0b1020'], background_angle: 90 })
    await render(<CardFrame look={look} width={W} height={H} />)
    const bg = background()!
    expect(bg.props).toMatchObject({ x: 0, y: 0, width: W, height: H })
    const g = within(bg).getByTestId('skia-LinearGradient')
    expect(g.props.colors).toEqual(['#1e1b4b', '#0b1020'])
    expect(g.props.start).toEqual({ x: 0, y: 50 })
    expect(g.props.end).toEqual({ x: 200, y: 50 })
  })

  it('pride: seis faixas duras (cada cor duas vezes, com as posições de corte)', async () => {
    await render(<CardFrame look={cardLook({ background: 'pride' })} width={W} height={H} />)
    const g = within(background()!).getByTestId('skia-LinearGradient')
    expect(g.props.colors).toHaveLength(12)
    expect(g.props.positions).toHaveLength(12)
  })

  it('fundo sólido: o quadro não desenha fundo (o do cartão é o do React Native)', async () => {
    const look = cardLook({ background: 'solid', background_colors: ['#112233'], border: 'gradient', border_colors: ['#111111', '#222222'] })
    await render(<CardFrame look={look} width={W} height={H} />)
    expect(background()).toBeUndefined()
  })
})

describe('CardFrame: borda', () => {
  it('arco-íris: contorno com as seis faixas da bandeira, por dentro do cartão', async () => {
    await render(<CardFrame look={cardLook({ border: 'rainbow', border_width: 4 })} width={W} height={H} />)
    const border = screen.getByTestId('skia-RoundedRect')
    // O traço é centrado na linha, então o retângulo entra metade da espessura para a borda não vazar.
    expect(border.props).toMatchObject({ style: 'stroke', strokeWidth: 4, x: 2, y: 2, width: W - 4, height: H - 4 })
    expect(within(border).getByTestId('skia-LinearGradient').props.colors).toEqual(PRIDE_STRIPES)
  })

  it('degradê: as duas cores do tema', async () => {
    const look = cardLook({ border: 'gradient', border_colors: ['#111111', '#222222'] })
    await render(<CardFrame look={look} width={W} height={H} />)
    expect(within(border()!).getByTestId('skia-LinearGradient').props.colors).toEqual(['#111111', '#222222'])
  })

  it('cor sólida ou neon (num quadro que existe por causa do fundo): contorno de uma cor, sem degradê', async () => {
    const look = cardLook({ background: 'pride', border: 'neon', border_colors: ['#ec4899'], border_width: 3 })
    await render(<CardFrame look={look} width={W} height={H} />)
    const stroke = border()!
    expect(stroke.props.color).toBe('#ec4899')
    expect(within(stroke).queryByTestId('skia-LinearGradient')).toBeNull()
  })

  it('sem borda: só o fundo', async () => {
    await render(<CardFrame look={cardLook({ background: 'pride' })} width={W} height={H} />)
    expect(border()).toBeUndefined()
  })
})

// Review Focus 2: cartão sem tamanho (antes do onLayout).
describe('CardFrame: tamanho', () => {
  it.each([
    [0, 100],
    [200, 0],
    [-1, 50]
  ])('%d×%d não monta canvas', async (w, h) => {
    await render(<CardFrame look={cardLook({ background: 'pride' })} width={w} height={h} />)
    expect(screen.queryByTestId('card-frame')).toBeNull()
  })

  it('o canvas não captura toques (o cartão continua tocável)', async () => {
    await render(<CardFrame look={cardLook({ background: 'pride' })} width={W} height={H} />)
    expect(screen.getByTestId('card-frame').props.pointerEvents).toBe('none')
  })
})
