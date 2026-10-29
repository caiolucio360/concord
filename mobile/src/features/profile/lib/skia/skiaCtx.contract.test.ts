import { CANVAS_EFFECTS, seededRand } from '../effects'
import { fakeCtx } from '../effects/fakeCtx'
import type { Ctx } from '../effects/types'
import { COMPOSITE_MODES } from './skiaCtx'

// Contrato entre as cenas e o adaptador: toda operação de composição que uma cena pede precisa ter
// mapeamento. Sem isso uma cena nova (ou o synthwave, que usa 'destination-out') desenha errado calada.
describe('contrato cenas x adaptador', () => {
  it.each(Object.keys(CANVAS_EFFECTS))('%s só pede operações de composição que o adaptador conhece', (id) => {
    const used = new Set<string>()
    const base = fakeCtx()
    const ctx = new Proxy(base, {
      set(target, prop, value) {
        if (prop === 'globalCompositeOperation') used.add(String(value))
        return Reflect.set(target, prop, value)
      }
    }) as unknown as Ctx
    const scene = CANVAS_EFFECTS[id]
    const rand = seededRand(3)
    const state = scene.init(340, 280, { density: 2.7, speed: 1, color: '#ff7a1a' }, rand)
    for (let i = 0; i < 3; i++) scene.step(state, 0.033, rand)
    scene.draw(ctx, state)
    for (const op of used) expect(Object.keys(COMPOSITE_MODES)).toContain(op)
  })
})
