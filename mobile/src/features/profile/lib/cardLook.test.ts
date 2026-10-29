import { colors } from '../../../shared/theme/tokens'
import { cardLook, needsFrame } from './cardLook'
import { DARK_INK, LIGHT_INK } from './profileInk'
import { PRIDE_PALETTE, PRIDE_STRIPES } from './profilePride'

describe('cardLook', () => {
  it('sem tema: sem borda, fundo e texto do app', () => {
    for (const theme of [null, undefined, {}]) {
      expect(cardLook(theme)).toMatchObject({
        borderWidth: 0,
        backgroundColor: colors.bgFloating,
        ink: 'light',
        textColor: colors.textStrong,
        mutedColor: colors.textMuted
      })
    }
  })

  it('fundo de cor sólida usa a cor', () => {
    const look = cardLook({ background: 'solid', background_colors: ['#112233'] })
    expect(look.backgroundColor).toBe('#112233')
  })

  it('degradê cai na primeira cor (o desenho de verdade vem com o Skia)', () => {
    const look = cardLook({ background: 'gradient', background_colors: ['#1e1b4b', '#0b1020'] })
    expect(look.backgroundColor).toBe('#1e1b4b')
    expect(look.ink).toBe('light')
  })

  it('fundo claro troca o texto para o escuro', () => {
    const look = cardLook({ background: 'solid', background_colors: ['#fce7f3'] })
    expect(look.ink).toBe('dark')
    expect(look.textColor).toBe(DARK_INK)
    expect(look.mutedColor).not.toBe(colors.textMuted)
  })

  it('fundo escuro mantém o texto claro', () => {
    const look = cardLook({ background: 'solid', background_colors: ['#1e1b4b'] })
    expect(look.ink).toBe('light')
    expect(look.textColor).toBe(LIGHT_INK)
  })

  it('pride usa a primeira faixa e texto claro', () => {
    const look = cardLook({ background: 'pride' })
    expect(look.backgroundColor).toBe(PRIDE_PALETTE[0])
    expect(look.ink).toBe('light')
  })

  it('borda: cor e espessura do tema', () => {
    const look = cardLook({ border: 'neon', border_colors: ['#00ffaa'], border_width: 4 })
    expect(look).toMatchObject({ borderWidth: 4, borderColor: '#00ffaa' })
  })

  it('borda sem espessura escolhida usa a padrão do tema', () => {
    expect(cardLook({ border: 'solid', border_colors: ['#ec4899'] }).borderWidth).toBe(2)
  })

  it('borda em degradê usa a primeira cor; arco-íris, a primeira faixa da bandeira', () => {
    expect(cardLook({ border: 'gradient', border_colors: ['#111111', '#222222'] }).borderColor).toBe('#111111')
    expect(cardLook({ border: 'rainbow' }).borderColor).toBe(PRIDE_STRIPES[0])
  })

  it('dado inválido do servidor volta ao padrão sem lançar erro', () => {
    const look = cardLook({ border: 'x', border_colors: ['vermelho'], background: 'solid', background_colors: ['#fff'] })
    expect(look).toMatchObject({ borderWidth: 0, backgroundColor: colors.bgFloating, ink: 'light' })
  })
})

describe('cardLook: degradê, borda e efeito (PR 2a)', () => {
  it('tema padrão: fundo sólido sem cores, sem borda e sem efeito', () => {
    const look = cardLook(null)
    expect(look.background).toEqual({ kind: 'solid', colors: [], angle: 180 })
    expect(look.border).toEqual({ kind: 'none', colors: [], width: 0 })
    expect(look.effect).toBeNull()
    expect(needsFrame(look)).toBe(false)
  })

  it('degradê de duas cores com o ângulo do tema', () => {
    const look = cardLook({ background: 'gradient', background_colors: ['#1e1b4b', '#0b1020'], background_angle: 45 })
    expect(look.background).toEqual({ kind: 'gradient', colors: ['#1e1b4b', '#0b1020'], angle: 45 })
    expect(needsFrame(look)).toBe(true)
  })

  it('pride: as seis faixas escurecidas, no ângulo do tema', () => {
    const look = cardLook({ background: 'pride', background_angle: 90 })
    expect(look.background).toEqual({ kind: 'pride', colors: PRIDE_PALETTE, angle: 90 })
  })

  it('borda: sólida e neon têm uma cor; degradê, duas; arco-íris, as seis faixas da bandeira', () => {
    expect(cardLook({ border: 'solid', border_colors: ['#ec4899'], border_width: 3 }).border).toEqual({ kind: 'solid', colors: ['#ec4899'], width: 3 })
    expect(cardLook({ border: 'neon', border_colors: ['#00ffaa'] }).border).toMatchObject({ kind: 'neon', colors: ['#00ffaa'] })
    expect(cardLook({ border: 'gradient', border_colors: ['#111111', '#222222'] }).border.colors).toEqual(['#111111', '#222222'])
    expect(cardLook({ border: 'rainbow' }).border).toMatchObject({ kind: 'rainbow', colors: PRIDE_STRIPES })
  })

  it('só degradê e arco-íris pedem o quadro do Skia; cor sólida e neon seguem nos estilos do React Native', () => {
    expect(needsFrame(cardLook({ border: 'solid', border_colors: ['#111111'] }))).toBe(false)
    expect(needsFrame(cardLook({ border: 'neon', border_colors: ['#111111'] }))).toBe(false)
    expect(needsFrame(cardLook({ background: 'solid', background_colors: ['#111111'] }))).toBe(false)
    expect(needsFrame(cardLook({ border: 'gradient', border_colors: ['#111111', '#222222'] }))).toBe(true)
    expect(needsFrame(cardLook({ border: 'rainbow' }))).toBe(true)
    expect(needsFrame(cardLook({ background: 'pride' }))).toBe(true)
  })

  it('efeito: id e parâmetros do tema (cor própria ganha da padrão do efeito)', () => {
    expect(cardLook({ effect: 'fire', effect_color: '#00ff00', effect_density: 100, effect_speed: 1 }).effect).toMatchObject({
      id: 'fire',
      params: { color: '#00ff00' }
    })
    expect(cardLook({ effect: 'fire' }).effect?.params).toMatchObject({ density: 1, speed: 1, color: '#ff7a1a' })
    expect(cardLook({ effect: 'confetti' }).effect?.params.color).toBe('#ffffff')
    expect(cardLook({ effect: 'snow' }).effect?.id).toBe('snow')
  })

  // Review Focus 4: efeito desconhecido ou "none" não monta canvas.
  it('efeito "none", desconhecido ou inválido: nenhum', () => {
    expect(cardLook({ effect: 'none' }).effect).toBeNull()
    expect(cardLook({ effect: 'fogos' as never }).effect).toBeNull()
    expect(cardLook({ effect: 'toString' as never }).effect).toBeNull()
  })

  it('dado inválido do servidor nunca lança erro', () => {
    expect(() => cardLook({ border: 'x', background: 'y', effect: 'z', effect_density: 'muito' as never })).not.toThrow()
  })
})
