import {
  BlendMode,
  PaintStyle,
  Skia,
  matchFont,
  StrokeCap,
  TileMode,
  type SkCanvas,
  type SkColor,
  type SkFont,
  type SkPaint,
  type SkPathBuilder,
  type SkShader
} from '@shopify/react-native-skia'
import type { Ctx, Gradient } from '../effects/types'

// Implementa o contexto 2D que as cenas de efeito usam (lib/effects/types.ts) sobre o canvas do Skia.
// Provado num spike (ADR 0024): gradiente linear e mistura aditiva (BlendMode.Plus) funcionam.

const TAU = Math.PI * 2
const DEFAULT_FONT_SIZE = 10
/** Operações de composição do canvas que as cenas usam; qualquer outra cai na sobreposição normal. */
export const COMPOSITE_MODES: Record<string, BlendMode> = {
  'source-over': BlendMode.SrcOver,
  lighter: BlendMode.Plus,
  'destination-out': BlendMode.DstOut
}

const CAPS: Record<string, StrokeCap> = { butt: StrokeCap.Butt, round: StrokeCap.Round, square: StrokeCap.Square }

const COLOR_CACHE = new Map<string, SkColor>()
const MAX_CACHED_COLORS = 512

/**
 * Cor do Skia a partir de "#rrggbb" ou "rgba(...)"; cor inválida vira transparente em vez de lançar erro.
 * Guarda a conversão: a Matrix e a neve repetem as mesmas poucas cores centenas de vezes por quadro.
 */
function toColor(value: string): SkColor {
  const cached = COLOR_CACHE.get(value)
  if (cached) return cached
  let color: SkColor
  try {
    color = Skia.Color(value)
  } catch {
    color = Skia.Color('transparent')
  }
  if (COLOR_CACHE.size >= MAX_CACHED_COLORS) COLOR_CACHE.clear()
  COLOR_CACHE.set(value, color)
  return color
}

const clamp01 = (v: number): number => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1)

/** Degradê do canvas do navegador: junta as paradas e só vira shader quando alguém pinta com ele. */
class StopGradient implements Gradient {
  private stops: { offset: number; color: SkColor }[] = []
  constructor(private make: (colors: SkColor[], positions: number[]) => SkShader) {}
  addColorStop(offset: number, color: string): void {
    this.stops.push({ offset, color: toColor(color) })
  }
  shader(): SkShader | null {
    if (this.stops.length === 0) return null
    return this.make(
      this.stops.map((s) => s.color),
      this.stops.map((s) => s.offset)
    )
  }
}

const DEFAULT_FAMILY = 'sans-serif'
interface CachedFont {
  font: SkFont
  ascent: number
  descent: number
}
const FONT_CACHE = new Map<string, CachedFont | null>()

/** Tamanho e família de uma fonte no formato do canvas ("14px monospace"). */
function parseFont(font: string): { size: number; family: string } {
  const match = /(\d+(?:\.\d+)?)px\s*(.*)$/.exec(font)
  const family = match?.[2].replace(/["']/g, '').trim()
  return { size: match ? Number(match[1]) : DEFAULT_FONT_SIZE, family: family || DEFAULT_FAMILY }
}

/**
 * Fonte do sistema para o texto (o Skia recusa fonte sem typeface). Guarda por `font` porque a Matrix pede a
 * mesma fonte para cada glifo de cada quadro. Família que o sistema não tem: null, e o texto não desenha.
 */
function fontFor(font: string): CachedFont | null {
  if (FONT_CACHE.has(font)) return FONT_CACHE.get(font) ?? null
  const { size, family } = parseFont(font)
  let found: CachedFont | null = null
  try {
    const skFont = matchFont({ fontFamily: family, fontSize: size })
    const { ascent, descent } = skFont.getMetrics()
    found = { font: skFont, ascent, descent }
  } catch {
    found = null
  }
  FONT_CACHE.set(font, found)
  return found
}

/** X da primeira letra: o Skia sempre alinha à esquerda, então o centro e a direita deslocam (e só aí mede). */
function alignedX(x: number, text: string, font: SkFont, align: string): number {
  if (align === 'center') return x - font.measureText(text).width / 2
  return align === 'right' || align === 'end' ? x - font.measureText(text).width : x
}

/** Y da linha de base a partir da posição pedida ("top" é o topo da letra, como no navegador). */
function baselineY(y: number, { ascent, descent }: CachedFont, baseline: string): number {
  if (baseline === 'top' || baseline === 'hanging') return y - ascent
  if (baseline === 'middle') return y - (ascent + descent) / 2
  return baseline === 'bottom' ? y - descent : y
}

/**
 * A tinta do Skia com o que já foi aplicado nela: cada chamada ao Skia atravessa a ponte nativa, e a Matrix
 * desenha centenas de glifos por quadro. Só chama quando o valor mudou.
 */
class PaintState {
  private style = -1
  private blend = -1
  private color: string | null = null
  private alpha = Number.NaN
  private width = Number.NaN
  private cap = -1
  private shaded = false

  constructor(readonly paint: SkPaint) {}

  setStyle(style: PaintStyle): void {
    if (this.style === style) return
    this.paint.setStyle(style)
    this.style = style
  }
  setBlend(blend: BlendMode): void {
    if (this.blend === blend) return
    this.paint.setBlendMode(blend)
    this.blend = blend
  }
  setStroke(width: number, cap: StrokeCap): void {
    if (this.width !== width) {
      this.paint.setStrokeWidth(width)
      this.width = width
    }
    if (this.cap !== cap) {
      this.paint.setStrokeCap(cap)
      this.cap = cap
    }
  }
  /** Cor lisa: tira o shader que sobrou de um degradê e só reaplica a cor se ela mudou. */
  setColor(value: string, alpha: number): void {
    const color = toColor(value)
    if (this.shaded) {
      this.paint.setShader(null)
      this.shaded = false
    }
    if (this.color !== value) {
      this.paint.setColor(color)
      this.color = value
      this.alpha = Number.NaN // setColor mexe no canal alfa
    }
    this.setAlpha((color[3] ?? 1) * alpha)
  }
  /** Degradê: o shader é novo a cada pedido, então sempre se aplica. */
  setShader(shader: SkShader | null, alpha: number): void {
    this.paint.setShader(shader)
    this.shaded = shader !== null
    this.paint.setColor(toColor('#ffffff'))
    this.color = '#ffffff'
    this.alpha = Number.NaN
    this.setAlpha(alpha)
  }
  private setAlpha(alpha: number): void {
    if (this.alpha === alpha) return
    this.paint.setAlphaf(alpha)
    this.alpha = alpha
  }
}

class SkiaCtx implements Ctx {
  fillStyle: string | Gradient = '#000000'
  strokeStyle: string | Gradient = '#000000'
  globalAlpha = 1
  globalCompositeOperation = 'source-over'
  lineWidth = 1
  lineCap = 'butt'
  font = `${DEFAULT_FONT_SIZE}px sans-serif`
  textAlign = 'left'
  textBaseline = 'alphabetic'
  private path: SkPathBuilder = Skia.PathBuilder.Make()
  private state: PaintState

  constructor(private canvas: SkCanvas) {
    const paint = Skia.Paint()
    paint.setAntiAlias(true)
    this.state = new PaintState(paint)
  }

  // --- pintura
  private paintFor(kind: 'fill' | 'stroke'): SkPaint {
    const state = this.state
    state.setStyle(kind === 'fill' ? PaintStyle.Fill : PaintStyle.Stroke)
    state.setBlend(COMPOSITE_MODES[this.globalCompositeOperation] ?? BlendMode.SrcOver)
    if (kind === 'stroke') state.setStroke(this.lineWidth, CAPS[this.lineCap] ?? StrokeCap.Butt)
    const source = kind === 'fill' ? this.fillStyle : this.strokeStyle
    const alpha = clamp01(this.globalAlpha)
    if (typeof source === 'string') state.setColor(source, alpha)
    else state.setShader((source as StopGradient).shader(), alpha)
    return state.paint
  }

  // --- retângulos e limpeza
  clearRect(): void {
    // As cenas só limpam o quadro inteiro, e cada quadro é uma gravação nova.
    this.canvas.clear(toColor('transparent'))
  }
  fillRect(x: number, y: number, w: number, h: number): void {
    this.canvas.drawRect(Skia.XYWHRect(x, y, w, h), this.paintFor('fill'))
  }

  // --- caminhos
  beginPath(): void {
    this.path = Skia.PathBuilder.Make()
  }
  closePath(): void {
    this.path.close()
  }
  moveTo(x: number, y: number): void {
    this.path.moveTo(x, y)
  }
  lineTo(x: number, y: number): void {
    this.path.lineTo(x, y)
  }
  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void {
    this.path.cubicTo(c1x, c1y, c2x, c2y, x, y)
  }
  arc(x: number, y: number, radius: number, start: number, end: number, counterclockwise = false): void {
    this.ellipse(x, y, radius, radius, 0, start, end, counterclockwise)
  }
  ellipse(x: number, y: number, rx: number, ry: number, _rotation: number, start: number, end: number, counterclockwise = false): void {
    const oval = Skia.XYWHRect(x - rx, y - ry, rx * 2, ry * 2)
    const sweep = end - start
    if (Math.abs(sweep) >= TAU) {
      if (rx === ry) this.path.addCircle(x, y, rx)
      else this.path.addOval(oval)
      return
    }
    const deg = (sweep * 180) / Math.PI
    this.path.addArc(oval, (start * 180) / Math.PI, counterclockwise && deg > 0 ? deg - 360 : deg)
  }
  fill(): void {
    this.canvas.drawPath(this.path.build(), this.paintFor('fill'))
  }
  stroke(): void {
    this.canvas.drawPath(this.path.build(), this.paintFor('stroke'))
  }

  // --- transformações
  save(): void {
    this.canvas.save()
  }
  restore(): void {
    this.canvas.restore()
  }
  translate(x: number, y: number): void {
    this.canvas.translate(x, y)
  }
  rotate(angle: number): void {
    this.canvas.rotate((angle * 180) / Math.PI, 0, 0)
  }
  scale(x: number, y: number): void {
    this.canvas.scale(x, y)
  }

  // --- degradês
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): Gradient {
    return new StopGradient((colors, positions) =>
      Skia.Shader.MakeLinearGradient({ x: x0, y: y0 }, { x: x1, y: y1 }, colors, positions, TileMode.Clamp)
    )
  }
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): Gradient {
    return new StopGradient((colors, positions) =>
      Skia.Shader.MakeTwoPointConicalGradient({ x: x0, y: y0 }, r0, { x: x1, y: y1 }, r1, colors, positions, TileMode.Clamp)
    )
  }

  // --- texto (fonte do sistema pela família e tamanho de `font`)
  fillText(text: string, x: number, y: number): void {
    const cached = fontFor(this.font)
    if (!cached) return
    const { font } = cached
    this.canvas.drawText(text, alignedX(x, text, font, this.textAlign), baselineY(y, cached, this.textBaseline), this.paintFor('fill'), font)
  }
}

/** Contexto 2D (o das cenas de efeito) que desenha no canvas do Skia; um por quadro gravado. */
export function createSkiaCtx(canvas: SkCanvas): Ctx {
  return new SkiaCtx(canvas)
}
