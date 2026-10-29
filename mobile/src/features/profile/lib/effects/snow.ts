// Neve: bolinhas de 2 a 5 dp que caem do topo com um leve balanço. No desktop eram CSS (pt-fx-snow);
// aqui são uma cena do mesmo laço. 18 por padrão, no máximo 40.
import type { Ctx, EffectParams, Rand, Scene } from './types'
import { between, countFor, TAU } from './util'

export interface Flake {
  x0: number
  y: number
  size: number
  /** dp por segundo. */
  vy: number
  sway: number
  phase: number
}

export interface SnowState {
  h: number
  t: number
  w: number
  color: string
  items: Flake[]
}

const BASE = 18
const MAX = 40
/** O CSS do desktop cai 720 px em 7 a 12 s. */
const FALL = 720
const ALPHA = 0.85

function newFlake(w: number, h: number, rand: Rand): Flake {
  return {
    x0: rand() * w,
    y: rand() * h,
    size: 2 + Math.round(rand() * 3),
    vy: FALL / between(rand, 7, 12),
    sway: between(rand, 4, 14),
    phase: rand() * TAU
  }
}

export const snowScene: Scene<SnowState> = {
  init(w: number, h: number, p: EffectParams, rand: Rand): SnowState {
    const count = countFor(BASE, p.density, MAX)
    return { w, h, t: 0, color: p.color, items: Array.from({ length: count }, () => newFlake(w, h, rand)) }
  },
  step(s: SnowState, dt: number, rand: Rand): void {
    s.t = (s.t + dt) % 1000
    for (const f of s.items) {
      f.y += f.vy * dt
      if (f.y > s.h + f.size) {
        f.y = -f.size
        f.x0 = rand() * s.w
      }
    }
  },
  draw(ctx: Ctx, s: SnowState): void {
    ctx.fillStyle = s.color
    ctx.globalAlpha = ALPHA
    for (const f of s.items) {
      ctx.beginPath()
      ctx.arc(f.x0 + Math.sin(s.t * 0.8 + f.phase) * f.sway, f.y, f.size / 2, 0, TAU)
      ctx.fill()
    }
  }
}
