import { describe, expect, it, vi } from 'vitest'
import { isOutside } from './useMediaPickerDismiss'

describe('isOutside', () => {
  class FakeNode {}
  vi.stubGlobal('Node', FakeNode)
  const inner = new FakeNode()
  const container = { contains: (t: unknown) => t === inner } as unknown as HTMLElement

  it('clique dentro do seletor não conta', () => {
    expect(isOutside(container, inner as EventTarget)).toBe(false)
  })
  it('clique fora (ou em algo que não é nó) fecha', () => {
    expect(isOutside(container, new FakeNode() as EventTarget)).toBe(true)
    expect(isOutside(container, null)).toBe(true)
  })
  it('sem o seletor montado não fecha', () => {
    expect(isOutside(null, inner as EventTarget)).toBe(false)
  })
})
