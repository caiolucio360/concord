import { BlendMode, PaintStyle, StrokeCap, createRecordingCanvas, type CanvasCall } from '../../../../tests/mocks/skia'
import { createSkiaCtx } from './skiaCtx'



function setup() {
  const canvas = createRecordingCanvas()
  const ctx = createSkiaCtx(canvas as never)
  const last = (op: string): CanvasCall => [...canvas.calls].reverse().find((c) => c.op === op) as CanvasCall
  return { canvas, ctx, last, ops: () => canvas.calls.map((c) => c.op) }
}

describe('cor, transparência e mistura', () => {
  it('fillRect pinta com a cor e a transparência', () => {
    const { ctx, last } = setup()
    ctx.fillStyle = '#ff0000'
    ctx.globalAlpha = 0.5
    ctx.fillRect(1, 2, 30, 40)
    const call = last('drawRect')
    expect(call.rect).toEqual({ x: 1, y: 2, width: 30, height: 40 })
    expect(call.paint).toMatchObject({ color: [1, 0, 0, 1], alpha: 0.5, style: PaintStyle.Fill, blendMode: BlendMode.SrcOver })
  })

  it('a transparência da própria cor multiplica a do contexto', () => {
    const { ctx, last } = setup()
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'
    ctx.globalAlpha = 0.5
    ctx.fillRect(0, 0, 1, 1)
    expect((last('drawRect').paint as { alpha: number }).alpha).toBeCloseTo(0.25)
  })

  it("'lighter' soma as cores (BlendMode.Plus); o resto é sobreposição normal", () => {
    const { ctx, last } = setup()
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillRect(0, 0, 1, 1)
    expect(last('drawRect').paint).toMatchObject({ blendMode: BlendMode.Plus })
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillRect(0, 0, 1, 1)
    expect(last('drawRect').paint).toMatchObject({ blendMode: BlendMode.SrcOver })
  })

  it('cor inválida não lança erro e vira transparente', () => {
    const { ctx, last } = setup()
    ctx.fillStyle = 'vermelho'
    expect(() => ctx.fillRect(0, 0, 1, 1)).not.toThrow()
    expect((last('drawRect').paint as { alpha: number }).alpha).toBe(0)
  })

  it('transparência fora de 0 a 1 ou inválida é limitada', () => {
    const { ctx, last } = setup()
    ctx.globalAlpha = 7
    ctx.fillRect(0, 0, 1, 1)
    expect((last('drawRect').paint as { alpha: number }).alpha).toBe(1)
    ctx.globalAlpha = -3
    ctx.fillRect(0, 0, 1, 1)
    expect((last('drawRect').paint as { alpha: number }).alpha).toBe(0)
    ctx.globalAlpha = Number.NaN
    ctx.fillRect(0, 0, 1, 1)
    expect((last('drawRect').paint as { alpha: number }).alpha).toBe(1)
  })
})

describe('caminhos', () => {
  it('beginPath, moveTo, lineTo, closePath e fill desenham o caminho; beginPath começa outro', () => {
    const { ctx, canvas } = setup()
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(10, 0)
    ctx.lineTo(10, 10)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(5, 5)
    ctx.fill()
    const [a, b] = canvas.calls.filter((c) => c.op === 'drawPath') as unknown as { path: { ops: unknown[] } }[]
    expect(a.path.ops).toEqual([['moveTo', 0, 0], ['lineTo', 10, 0], ['lineTo', 10, 10], ['close']])
    expect(b.path.ops).toEqual([['moveTo', 5, 5]])
  })

  it('curva de Bézier vira cubicTo', () => {
    const { ctx, last } = setup()
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.bezierCurveTo(1, 2, 3, 4, 5, 6)
    ctx.fill()
    expect((last('drawPath').path as { ops: unknown[] }).ops[1]).toEqual(['cubicTo', 1, 2, 3, 4, 5, 6])
  })

  it('arco completo é um círculo; arco parcial usa os graus e o sentido', () => {
    const { ctx, last } = setup()
    ctx.beginPath()
    ctx.arc(10, 20, 5, 0, Math.PI * 2)
    ctx.fill()
    expect((last('drawPath').path as { ops: unknown[] }).ops).toEqual([['addCircle', 10, 20, 5]])
    ctx.beginPath()
    ctx.arc(0, 0, 10, 0, Math.PI)
    ctx.fill()
    const [name, rect, start, sweep] = (last('drawPath').path as { ops: unknown[][] }).ops[0]
    expect(name).toBe('addArc')
    expect(rect).toEqual({ x: -10, y: -10, width: 20, height: 20 })
    expect(start).toBeCloseTo(0)
    expect(sweep).toBeCloseTo(180)
    ctx.beginPath()
    ctx.arc(0, 0, 10, 0, Math.PI / 2, true)
    ctx.fill()
    expect(((last('drawPath').path as { ops: unknown[][] }).ops[0][3] as number)).toBeCloseTo(-270)
  })

  it('elipse completa vira oval; parcial vira arco na oval', () => {
    const { ctx, last } = setup()
    ctx.beginPath()
    ctx.ellipse(10, 10, 6, 3, 0, 0, Math.PI * 2)
    ctx.fill()
    expect((last('drawPath').path as { ops: unknown[][] }).ops[0]).toEqual(['addOval', { x: 4, y: 7, width: 12, height: 6 }])
    ctx.beginPath()
    ctx.ellipse(10, 10, 6, 3, 0, 0, Math.PI)
    ctx.fill()
    expect(((last('drawPath').path as { ops: unknown[][] }).ops[0][0])).toBe('addArc')
  })

  it('stroke usa cor, largura e ponta da linha', () => {
    const { ctx, last } = setup()
    ctx.strokeStyle = '#00ff00'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(5, 5)
    ctx.stroke()
    expect(last('drawPath').paint).toMatchObject({ style: PaintStyle.Stroke, strokeWidth: 3, cap: StrokeCap.Round, color: [0, 1, 0, 1] })
  })
})

describe('degradês', () => {
  it('linear: as paradas viram cores e posições do shader', () => {
    const { ctx, last } = setup()
    const g = ctx.createLinearGradient(0, 100, 0, 0)
    g.addColorStop(0, '#ff0000')
    g.addColorStop(1, 'rgba(0, 0, 255, 0.5)')
    ctx.fillStyle = g
    ctx.globalAlpha = 0.8
    ctx.fillRect(0, 0, 10, 100)
    const paint = last('drawRect').paint as { shader: { kind: string; args: unknown[][] }; alpha: number }
    expect(paint.shader.kind).toBe('linear')
    expect(paint.shader.args.slice(0, 2)).toEqual([{ x: 0, y: 100 }, { x: 0, y: 0 }])
    expect(paint.shader.args[3]).toEqual([0, 1])
    expect(paint.alpha).toBeCloseTo(0.8)
  })

  it('radial: usa os dois círculos (como o canvas do navegador)', () => {
    const { ctx, last } = setup()
    const g = ctx.createRadialGradient(5, 5, 1, 6, 7, 20)
    g.addColorStop(0, '#ffffff')
    g.addColorStop(1, '#000000')
    ctx.strokeStyle = g
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.stroke()
    const shader = (last('drawPath').paint as { shader: { kind: string; args: unknown[] } }).shader
    expect(shader.kind).toBe('conical')
    expect(shader.args.slice(0, 4)).toEqual([{ x: 5, y: 5 }, 1, { x: 6, y: 7 }, 20])
  })

  it('degradê sem paradas ou com cor ruim não lança erro', () => {
    const { ctx } = setup()
    const g = ctx.createLinearGradient(0, 0, 1, 1)
    g.addColorStop(0, 'xx')
    ctx.fillStyle = g
    expect(() => ctx.fillRect(0, 0, 1, 1)).not.toThrow()
    ctx.fillStyle = ctx.createLinearGradient(0, 0, 1, 1)
    expect(() => ctx.fillRect(0, 0, 1, 1)).not.toThrow()
  })
})

describe('transformações, texto e limpeza', () => {
  it('save, translate, rotate (radianos viram graus), scale e restore, na ordem', () => {
    const { ctx, canvas, ops } = setup()
    ctx.save()
    ctx.translate(3, 4)
    ctx.rotate(Math.PI / 2)
    ctx.scale(2, 3)
    ctx.restore()
    expect(ops()).toEqual(['save', 'translate', 'rotate', 'scale', 'restore'])
    expect((canvas.calls[2] as unknown as { degrees: number }).degrees).toBeCloseTo(90)
  })

  it('clearRect limpa o quadro', () => {
    const { ctx, last } = setup()
    ctx.clearRect(0, 0, 10, 10)
    expect(last('clear')).toBeDefined()
  })

  it('texto: tamanho da fonte, alinhamento e linha de base', () => {
    const { ctx, last } = setup()
    ctx.fillStyle = '#00ff00'
    ctx.font = '14px monospace'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText('A', 10, 20)
    const top = last('drawText')
    expect(top).toMatchObject({ text: 'A', size: 14, x: 10 })
    expect(top.y as number).toBeGreaterThan(20)
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'center'
    ctx.fillText('AB', 10, 20)
    const centered = last('drawText')
    expect(centered.y).toBe(20)
    expect(centered.x as number).toBeLessThan(10)
  })

  it('fonte sem tamanho legível usa 10', () => {
    const { ctx, last } = setup()
    ctx.font = 'sans-serif'
    ctx.fillText('A', 0, 0)
    expect(last('drawText').size).toBe(10)
  })
})
