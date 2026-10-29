import { colors } from '../../../shared/theme/tokens'
import { canvasScene } from './effects'
import type { EffectParams } from './effects/types'
import { DARK_INK, LIGHT_INK, pickInk, type Ink } from './profileInk'
import { PRIDE_PALETTE, PRIDE_STRIPES } from './profilePride'
import { effectDef, resolveProfileTheme, type ProfileTheme } from './profileTheme'
import { effectParams } from './profileThemeExtras'

export interface CardBackground {
  kind: 'solid' | 'gradient' | 'pride'
  /** Sólido: a cor (vazio = fundo do app); degradê: as duas; pride: as seis faixas escurecidas. */
  colors: string[]
  angle: number
}

export interface CardBorder {
  kind: 'none' | 'solid' | 'neon' | 'rainbow' | 'gradient'
  colors: string[]
  width: number
}

/**
 * Como o cartão aparece com o tema. Os campos planos (`borderWidth`, `backgroundColor`...) são os estilos do
 * React Native e servem de fallback (degradê vira a primeira cor); `background`, `border` e `effect` dizem
 * o desenho de verdade, que o Skia faz (CardFrame e EffectCanvas). O brilho do neon e a animação da borda
 * chegam no PR 2c.
 */
export interface CardLook {
  borderWidth: number
  borderColor: string
  /** Fundo do corpo do cartão; também o recorte do avatar. */
  backgroundColor: string
  ink: Ink
  textColor: string
  mutedColor: string
  background: CardBackground
  border: CardBorder
  /** Efeito animado do tema, ou null (sem efeito, desconhecido ou "none"). */
  effect: { id: string; params: EffectParams } | null
}

function borderOf(theme: ProfileTheme): CardBorder {
  if (theme.border === 'none') return { kind: 'none', colors: [], width: 0 }
  const colors = theme.border === 'rainbow' ? PRIDE_STRIPES : theme.border_colors
  return { kind: theme.border as CardBorder['kind'], colors, width: theme.border_width }
}

function backgroundOf(theme: ProfileTheme): CardBackground {
  const kind = theme.background === 'gradient' || theme.background === 'pride' ? theme.background : 'solid'
  return { kind, colors: backgroundPalette(theme), angle: theme.background_angle }
}

function effectOf(theme: ProfileTheme): CardLook['effect'] {
  const def = effectDef(theme.effect)
  if (def.id === 'none' || !canvasScene(def.id)) return null
  return { id: def.id, params: effectParams(theme, def.color ?? '#ffffff') }
}

/** Só degradê e arco-íris precisam do quadro do Skia; cor sólida e neon seguem nos estilos do React Native. */
export function needsFrame(look: CardLook): boolean {
  return (
    look.background.kind === 'gradient' ||
    look.background.kind === 'pride' ||
    look.border.kind === 'gradient' ||
    look.border.kind === 'rainbow'
  )
}

/** Cores reais do fundo (no pride, as faixas escurecidas): o texto precisa vencer todas. */
function backgroundPalette(theme: ProfileTheme): string[] {
  return theme.background === 'pride' ? PRIDE_PALETTE : theme.background_colors
}

function inkOf(palette: string[]): Pick<CardLook, 'ink' | 'textColor' | 'mutedColor'> {
  if (palette.length === 0) return { ink: 'light', textColor: colors.textStrong, mutedColor: colors.textMuted }
  return pickInk(palette) === 'dark'
    ? { ink: 'dark', textColor: DARK_INK, mutedColor: 'rgba(30, 31, 34, 0.7)' }
    : { ink: 'light', textColor: LIGHT_INK, mutedColor: 'rgba(255, 255, 255, 0.7)' }
}

export function cardLook(raw: Partial<ProfileTheme> | null | undefined): CardLook {
  const theme = resolveProfileTheme(raw)
  const palette = backgroundPalette(theme)
  const border = borderOf(theme)
  return {
    borderWidth: border.width,
    borderColor: border.colors[0] ?? 'transparent',
    backgroundColor: palette[0] ?? colors.bgFloating,
    ...inkOf(palette),
    background: backgroundOf(theme),
    border,
    effect: effectOf(theme)
  }
}
