import { describe, expect, it, vi } from 'vitest'
import { insideElement } from './insideElement'

describe('insideElement', () => {
  class FakeNode {}
  vi.stubGlobal('Node', FakeNode)
  const inner = new FakeNode()
  const el = { contains: (t: unknown) => t === inner } as unknown as Element

  it('dentro', () => expect(insideElement(el, inner as EventTarget)).toBe(true))
  it('fora, sem elemento ou alvo que não é nó', () => {
    expect(insideElement(el, new FakeNode() as EventTarget)).toBe(false)
    expect(insideElement(null, inner as EventTarget)).toBe(false)
    expect(insideElement(el, null)).toBe(false)
  })
})
