// Partículas: bolinhas de 2 a 5 dp que sobem devagar, aparecem e somem. No desktop eram CSS
// (pt-fx-particles); aqui são uma cena do mesmo laço. 14 por padrão, no máximo 40.
import type { Ctx, EffectParams, Rand, Scene } from './types'
import { between, countFor, TAU } from './util'

export interface Particle {
  x: number
  /** Onde a partícula nasce; ela sobe RISE dp ao longo da vida. */
  y0: number
  size: number
  age: number
  duration: number
}

export interface ParticlesState {
  color: string
  items: Particle[]
}

const BASE = 14
const MAX = 40
const RISE = 60
const PEAK = 0.55

/** Transparência ao longo da vida p (0 a 1): sobe até 0,55 em 20%, fica até 70% e some. */
export function particleAlpha(p: number): number {
  const k = Math.min(1, Math.max(0, p))
  if (k < 0.2) return (PEAK * k) / 0.2
  if (k <= 0.7) return PEAK
  return PEAK * (1 - (k - 0.7) / 0.3)
}

function newParticle(w: number, h: number, rand: Rand): Particle {
  const duration = between(rand, 3, 6)
  // Já abre no meio da vida, para não começar vazio.
  return { x: rand() * w, y0: rand() * h, size: 2 + Math.round(rand() * 3), age: rand() * duration, duration }
}

export const particlesScene: Scene<ParticlesState> = {
  init(w: number, h: number, p: EffectParams, rand: Rand): ParticlesState {
    const count = countFor(BASE, p.density, MAX)
    return { color: p.color, items: Array.from({ length: count }, () => newParticle(w, h, rand)) }
  },
  step(s: ParticlesState, dt: number): void {
    for (const p of s.items) p.age = (p.age + dt) % p.duration
  },
  draw(ctx: Ctx, s: ParticlesState): void {
    ctx.fillStyle = s.color
    for (const p of s.items) {
      const life = p.age / p.duration
      ctx.globalAlpha = particleAlpha(life)
      ctx.beginPath()
      ctx.arc(p.x, p.y0 - RISE * life, p.size / 2, 0, TAU)
      ctx.fill()
    }
  }
}
