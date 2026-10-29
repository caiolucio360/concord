// Brilhos: estrelas de 4 pontas de 8 a 14 dp que giram até 45° e pulsam. No desktop eram CSS
// (pt-fx-sparkles); aqui são uma cena do mesmo laço. 10 por padrão, no máximo 40.
import type { Ctx, EffectParams, Rand, Scene } from './types'
import { between, countFor } from './util'

export interface Sparkle {
  x: number
  y: number
  size: number
  age: number
  duration: number
}

export interface SparklesState {
  color: string
  items: Sparkle[]
}

const BASE = 10
const MAX = 40
/** Fração do raio externo onde ficam as pontas internas da estrela. */
const INNER = 0.25

/** Estado do pulso na vida p (0 a 1): some nas pontas do ciclo e brilha no meio. */
export function twinkle(p: number): { alpha: number; scale: number; rot: number } {
  const k = Math.sin(Math.PI * Math.min(1, Math.max(0, p)))
  return { alpha: 0.9 * k, scale: 0.4 + 0.6 * k, rot: (Math.PI / 4) * k }
}

function newSparkle(w: number, h: number, rand: Rand): Sparkle {
  const duration = between(rand, 3, 6)
  return { x: rand() * w, y: rand() * h, size: 8 + Math.round(rand() * 6), age: rand() * duration, duration }
}

function traceStar(ctx: Ctx, radius: number): void {
  const r = radius * INNER
  ctx.beginPath()
  ctx.moveTo(0, -radius)
  ctx.lineTo(r, -r)
  ctx.lineTo(radius, 0)
  ctx.lineTo(r, r)
  ctx.lineTo(0, radius)
  ctx.lineTo(-r, r)
  ctx.lineTo(-radius, 0)
  ctx.lineTo(-r, -r)
  ctx.closePath()
}

export const sparklesScene: Scene<SparklesState> = {
  init(w: number, h: number, p: EffectParams, rand: Rand): SparklesState {
    const count = countFor(BASE, p.density, MAX)
    return { color: p.color, items: Array.from({ length: count }, () => newSparkle(w, h, rand)) }
  },
  step(s: SparklesState, dt: number): void {
    for (const p of s.items) p.age = (p.age + dt) % p.duration
  },
  draw(ctx: Ctx, s: SparklesState): void {
    ctx.fillStyle = s.color
    for (const p of s.items) {
      const t = twinkle(p.age / p.duration)
      ctx.globalAlpha = t.alpha
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(t.rot)
      ctx.scale(t.scale, t.scale)
      traceStar(ctx, p.size / 2)
      ctx.fill()
      ctx.restore()
    }
  }
}
