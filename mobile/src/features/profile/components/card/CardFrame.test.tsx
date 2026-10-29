import { render, screen, within } from '@testing-library/react-native'
import { cardLook } from '../../lib/cardLook'
import { PRIDE_STRIPES } from '../../lib/profilePride'
import { CardFrame } from './CardFrame'

// As camadas do cartão ficam ocultas do leitor de tela de propósito: os testes as procuram assim mesmo.
const HIDDEN = { includeHiddenElements: true } as const

const W = 200
const H = 100

type Look = ReturnType<typeof cardLook>

// O RoundedRect do Skia não tem testID: o fundo é o que não é traço, a borda é o de style="stroke".
const rects = () => screen.queryAllByTestId('skia-RoundedRect', HIDDEN)
const background = () => rects().find((r) => r.props.style !== 'stroke')
const border = () => rects().find((r) => r.props.style === 'stroke')
const drawBackground = (look: Look) => render(<CardFrame look={look} layer="background" width={W} height={H} />)
const drawBorder = (look: Look) => render(<CardFrame look={look} layer="border" width={W} height={H} />)

describe('CardFrame: camada do fundo', () => {
  it('degradê: as duas cores do tema na linha do ângulo (90° = esquerda para direita)', async () => {
    await drawBackground(cardLook({ background: 'gradient', background_colors: ['#1e1b4b', '#0b1020'], background_angle: 90 }))
    const rect = background()!
    expect(rect.props).toMatchObject({ x: 0, y: 0, width: W, height: H })
    const g = within(rect).getByTestId('skia-LinearGradient', HIDDEN)
    expect(g.props.colors).toEqual(['#1e1b4b', '#0b1020'])
    expect(g.props.start).toEqual({ x: 0, y: 50 })
    expect(g.props.end).toEqual({ x: 200, y: 50 })
  })

  it('pride: seis faixas duras (cada cor duas vezes, com as posições de corte)', async () => {
    await drawBackground(cardLook({ background: 'pride' }))
    const g = within(background()!).getByTestId('skia-LinearGradient', HIDDEN)
    expect(g.props.colors).toHaveLength(12)
    expect(g.props.positions).toHaveLength(12)
  })

  it('fundo sólido: nada a desenhar (o do cartão é o do React Native)', async () => {
    await drawBackground(cardLook({ background: 'solid', background_colors: ['#112233'], border: 'gradient', border_colors: ['#111111', '#222222'] }))
    expect(screen.queryByTestId('card-frame-background', HIDDEN)).toBeNull()
  })

  it('a camada do fundo nunca desenha a borda', async () => {
    await drawBackground(cardLook({ background: 'pride', border: 'rainbow' }))
    expect(border()).toBeUndefined()
  })
})

describe('CardFrame: camada da borda (fica por cima do banner)', () => {
  it('arco-íris: contorno com as seis faixas da bandeira, por dentro do cartão', async () => {
    await drawBorder(cardLook({ border: 'rainbow', border_width: 4 }))
    const rect = border()!
    // O traço é centrado na linha, então o retângulo entra metade da espessura para a borda não vazar.
    expect(rect.props).toMatchObject({ style: 'stroke', strokeWidth: 4, x: 2, y: 2, width: W - 4, height: H - 4 })
    expect(within(rect).getByTestId('skia-LinearGradient', HIDDEN).props.colors).toEqual(PRIDE_STRIPES)
  })

  it('degradê: as duas cores do tema', async () => {
    await drawBorder(cardLook({ border: 'gradient', border_colors: ['#111111', '#222222'] }))
    expect(within(border()!).getByTestId('skia-LinearGradient', HIDDEN).props.colors).toEqual(['#111111', '#222222'])
  })

  it('cor sólida ou neon (num quadro que existe por causa do fundo): contorno de uma cor, sem degradê', async () => {
    await drawBorder(cardLook({ background: 'pride', border: 'neon', border_colors: ['#ec4899'], border_width: 3 }))
    const rect = border()!
    expect(rect.props.color).toBe('#ec4899')
    expect(within(rect).queryByTestId('skia-LinearGradient', HIDDEN)).toBeNull()
  })

  it('sem borda: nada a desenhar', async () => {
    await drawBorder(cardLook({ background: 'pride' }))
    expect(screen.queryByTestId('card-frame-border', HIDDEN)).toBeNull()
  })

  it('a camada da borda nunca desenha o fundo', async () => {
    await drawBorder(cardLook({ background: 'pride', border: 'rainbow' }))
    expect(background()).toBeUndefined()
  })
})

// Review Focus 2: cartão sem tamanho (antes do onLayout).
describe('CardFrame: tamanho e toque', () => {
  it.each([
    [0, 100],
    [200, 0],
    [-1, 50]
  ])('%d×%d não monta canvas', async (w, h) => {
    await render(<CardFrame look={cardLook({ background: 'pride', border: 'rainbow' })} layer="background" width={w} height={h} />)
    expect(screen.queryByTestId('card-frame-background', HIDDEN)).toBeNull()
  })

  it.each(['background', 'border'] as const)('a camada %s fica num wrapper que não captura toques nem aparece para o leitor de tela', async (layer) => {
    await render(<CardFrame look={cardLook({ background: 'pride', border: 'rainbow' })} layer={layer} width={W} height={H} />)
    const wrapper = screen.getByTestId(`card-frame-${layer}`, HIDDEN)
    expect(wrapper.props).toMatchObject({
      pointerEvents: 'none',
      accessibilityElementsHidden: true,
      importantForAccessibility: 'no-hide-descendants'
    })
    expect(within(wrapper).getByTestId('skia-canvas', HIDDEN)).toBeOnTheScreen()
  })
})
