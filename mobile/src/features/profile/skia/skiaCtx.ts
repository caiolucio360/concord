import {
  BlendMode,
  PaintStyle,
  Skia,
  StrokeCap,
  TileMode,
  type SkCanvas,
  type SkColor,
  type SkFont,
  type SkPaint,
  type SkPathBuilder,
  type SkShader
} from '@shopify/react-native-skia'
import type { Ctx, Gradient } from '../lib/effects/types'

// Implementa o contexto 2D que as cenas de efeito usam (lib/effects/types.ts) sobre o canvas do Skia.
// Provado num spike (ADR 0024): gradiente linear e mistura aditiva (BlendMode.Plus) funcionam.

const TAU = Math.PI * 2
const DEFAULT_FONT_SIZE = 10
const CAPS: Record<string, StrokeCap> = { butt: StrokeCap.Butt, round: StrokeCap.Round, square: StrokeCap.Square }

/** Cor do Skia a partir de "#rrggbb" ou "rgba(...)"; cor inválida vira transparente em vez de lançar erro. */
function toColor(value: string): SkColor {
  try {
    return Skia.Color(value)
  } catch {
    return Skia.Color('transparent')
  }
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

function fontSizeOf(font: string): number {
  const match = /(\d+(?:\.\d+)?)px/.exec(font)
  return match ? Number(match[1]) : DEFAULT_FONT_SIZE
}

/** X da primeira letra: o Skia sempre alinha à esquerda, então o centro e a direita deslocam. */
function alignedX(x: number, width: number, align: string): number {
  if (align === 'center') return x - width / 2
  return align === 'right' || align === 'end' ? x - width : x
}

/** Y da linha de base a partir da posição pedida ("top" é o topo da letra, como no navegador). */
function baselineY(y: number, font: SkFont, baseline: string): number {
  const { ascent, descent } = font.getMetrics()
  if (baseline === 'top' || baseline === 'hanging') return y - ascent
  if (baseline === 'middle') return y - (ascent + descent) / 2
  return baseline === 'bottom' ? y - descent : y
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
  private paint: SkPaint = Skia.Paint()

  constructor(private canvas: SkCanvas) {
    this.paint.setAntiAlias(true)
  }

  // --- pintura
  private source(style: string | Gradient): void {
    const p = this.paint
    const alpha = clamp01(this.globalAlpha)
    if (typeof style === 'string') {
      const color = toColor(style)
      p.setShader(null)
      p.setColor(color)
      p.setAlphaf((color[3] ?? 1) * alpha)
      return
    }
    p.setShader((style as StopGradient).shader())
    p.setColor(toColor('#ffffff'))
    p.setAlphaf(alpha)
  }

  private paintFor(kind: 'fill' | 'stroke'): SkPaint {
    const p = this.paint
    p.setStyle(kind === 'fill' ? PaintStyle.Fill : PaintStyle.Stroke)
    p.setBlendMode(this.globalCompositeOperation === 'lighter' ? BlendMode.Plus : BlendMode.SrcOver)
    if (kind === 'stroke') {
      p.setStrokeWidth(this.lineWidth)
      p.setStrokeCap(CAPS[this.lineCap] ?? StrokeCap.Butt)
    }
    this.source(kind === 'fill' ? this.fillStyle : this.strokeStyle)
    return p
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

  // --- texto (fonte padrão do sistema; só o tamanho de `font` vale)
  fillText(text: string, x: number, y: number): void {
    const font = Skia.Font(undefined, fontSizeOf(this.font))
    const width = font.measureText(text).width
    this.canvas.drawText(text, alignedX(x, width, this.textAlign), baselineY(y, font, this.textBaseline), this.paintFor('fill'), font)
  }
}

/** Contexto 2D (o das cenas de efeito) que desenha no canvas do Skia; um por quadro gravado. */
export function createSkiaCtx(canvas: SkCanvas): Ctx {
  return new SkiaCtx(canvas)
}
