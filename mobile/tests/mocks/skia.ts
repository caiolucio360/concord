// Mock do @shopify/react-native-skia para o Jest (o módulo é nativo e não carrega no Node). Grava o que o
// código pede ao canvas, para os testes conferirem sem GPU. Registrado em jest.setup.js.
import { createElement } from 'react'
import { View } from 'react-native'

export const BlendMode = { SrcOver: 3, DstOut: 8, Plus: 12 } as const
export const PaintStyle = { Fill: 0, Stroke: 1 } as const
export const StrokeCap = { Butt: 0, Round: 1, Square: 2 } as const
export const TileMode = { Clamp: 0 } as const

const NAMED: Record<string, number[]> = { transparent: [0, 0, 0, 0] }

/** Como o Skia: cor inválida lança erro. Devolve [r, g, b, a] de 0 a 1. */
function parseColor(value: string): Float32Array {
  const text = value.trim().toLowerCase()
  if (NAMED[text]) return Float32Array.from(NAMED[text])
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(text)
  if (hex) {
    const d = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1]
    const n = (i: number): number => parseInt(d.slice(i, i + 2), 16) / 255
    return Float32Array.from([n(0), n(2), n(4), d.length === 8 ? n(6) : 1])
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)$/.exec(text)
  if (rgb) return Float32Array.from([+rgb[1] / 255, +rgb[2] / 255, +rgb[3] / 255, rgb[4] === undefined ? 1 : +rgb[4]])
  throw new Error(`cor inválida: ${value}`)
}

export interface PaintSnapshot {
  /** Quantas vezes algum setter foi chamado até aqui (mede o custo de reaplicar o estilo). */
  setCalls: number
  blendMode: number
  color: number[]
  alpha: number
  shader: unknown
  style: number
  strokeWidth: number
  cap: number
}

class MockPaint {
  state: PaintSnapshot = { setCalls: 0, blendMode: BlendMode.SrcOver, color: [0, 0, 0, 1], alpha: 1, shader: null, style: PaintStyle.Fill, strokeWidth: 0, cap: StrokeCap.Butt }
  setAntiAlias(): void {}
  setBlendMode(m: number): void {
    this.state.setCalls++
    this.state.blendMode = m
  }
  setColor(c: ArrayLike<number>): void {
    this.state.setCalls++
    this.state.color = Array.from(c)
    this.state.alpha = c[3] ?? 1
  }
  setAlphaf(a: number): void {
    this.state.setCalls++
    this.state.alpha = a
  }
  setShader(s: unknown): void {
    this.state.setCalls++
    this.state.shader = s
  }
  setStyle(s: number): void {
    this.state.setCalls++
    this.state.style = s
  }
  setStrokeWidth(w: number): void {
    this.state.setCalls++
    this.state.strokeWidth = w
  }
  setStrokeCap(c: number): void {
    this.state.setCalls++
    this.state.cap = c
  }
  snapshot(): PaintSnapshot {
    return { ...this.state, color: [...this.state.color] }
  }
}

export type PathOp = [string, ...unknown[]]

class MockPathBuilder {
  ops: PathOp[] = []
  private add(...op: PathOp): this {
    this.ops.push(op)
    return this
  }
  moveTo(x: number, y: number): this {
    return this.add('moveTo', x, y)
  }
  lineTo(x: number, y: number): this {
    return this.add('lineTo', x, y)
  }
  cubicTo(...a: number[]): this {
    return this.add('cubicTo', ...a)
  }
  close(): this {
    return this.add('close')
  }
  addCircle(x: number, y: number, r: number): this {
    return this.add('addCircle', x, y, r)
  }
  addOval(rect: unknown): this {
    return this.add('addOval', rect)
  }
  addArc(rect: unknown, start: number, sweep: number): this {
    return this.add('addArc', rect, start, sweep)
  }
  build(): { ops: PathOp[] } {
    return { ops: [...this.ops] }
  }
}

export type CanvasCall = { op: string; [key: string]: unknown }

/** Canvas que só anota as chamadas, na ordem. */
export function createRecordingCanvas(): { calls: CanvasCall[] } & Record<string, (...a: never[]) => void> {
  const calls: CanvasCall[] = []
  const rec = (op: string, data: Record<string, unknown> = {}): void => {
    calls.push({ op, ...data })
  }
  const canvas = {
    calls,
    clear: (color: unknown) => rec('clear', { color }),
    save: () => rec('save'),
    restore: () => rec('restore'),
    translate: (x: number, y: number) => rec('translate', { x, y }),
    rotate: (degrees: number) => rec('rotate', { degrees }),
    scale: (x: number, y: number) => rec('scale', { x, y }),
    drawRect: (rect: unknown, paint: MockPaint) => rec('drawRect', { rect, paint: paint.snapshot() }),
    drawPath: (path: unknown, paint: MockPaint) => rec('drawPath', { path, paint: paint.snapshot() }),
    drawText: (text: string, x: number, y: number, paint: MockPaint, font: { size: number; family: string }) =>
      rec('drawText', { text, x, y, size: font.size, family: font.family, paint: paint.snapshot() })
  }
  return canvas as never
}

export class MockFont {
  measureCalls = 0
  metricsCalls = 0
  constructor(readonly typeface: unknown, public size: number, readonly family = 'default') {}
  measureText(text: string): { width: number } {
    this.measureCalls++
    return { width: text.length * this.size * 0.6 }
  }
  getMetrics(): { ascent: number; descent: number } {
    this.metricsCalls++
    return { ascent: -this.size * 0.9, descent: this.size * 0.25 }
  }
}

const gradient = (kind: string) => (...args: unknown[]) => ({ kind, args })

export const Skia = {
  Paint: () => new MockPaint(),
  Color: parseColor,
  XYWHRect: (x: number, y: number, width: number, height: number) => ({ x, y, width, height }),
  PathBuilder: { Make: () => new MockPathBuilder() },
  Shader: { MakeLinearGradient: gradient('linear'), MakeTwoPointConicalGradient: gradient('conical') },
  // O Skia real recusa fonte sem typeface ("Expected Typeface but got non-object"): o mock também.
  Font: (typeface?: unknown, size = 14) => {
    if (typeof typeface !== 'object' || typeface === null) throw new Error('Expected Typeface but got non-object')
    return new MockFont(typeface, size)
  },
  PictureRecorder: () => ({
    beginRecording: () => createRecordingCanvas(),
    finishRecordingAsPicture: () => ({ recorded: true })
  })
}

// Componentes: viram View com o nome no testID (que os testes podem trocar) e todas as props, para conferir
// o que o código pediu ao Skia (cores, posições, tamanho).
const component = (name: string) => (props: Record<string, unknown>) =>
  createElement(View, { testID: `skia-${name}`, ...props } as never, props.children as never)

export const matchFont = jest.fn((style: { fontFamily?: string; fontSize?: number } = {}) => {
  if (style.fontFamily === 'sem-essa-familia') throw new Error('família não encontrada')
  return new MockFont({}, style.fontSize ?? 14, style.fontFamily)
})

export const Canvas = component('canvas')
export const Picture = component('picture')
export const RoundedRect = component('RoundedRect')
export const Group = component('Group')
export const Path = component('Path')
export const LinearGradient = component('LinearGradient')
export const vec = (x: number, y: number) => ({ x, y })
