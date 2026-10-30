import { afterEach, describe, expect, it, vi } from 'vitest'
import { observeOnce } from './observeOnce'

type Callback = (entries: { isIntersecting: boolean }[]) => void

function fakeObserver(): { fire: (hit: boolean) => void; disconnect: ReturnType<typeof vi.fn> } {
  let cb: Callback = () => {}
  const disconnect = vi.fn()
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: Callback) {
        cb = callback
      }
      observe(): void {}
      disconnect = disconnect
    }
  )
  return { fire: (hit) => cb([{ isIntersecting: hit }]), disconnect }
}

describe('observeOnce', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('sem elemento ou sem IntersectionObserver chama na hora', () => {
    const onVisible = vi.fn()
    observeOnce(null, onVisible)()
    expect(onVisible).toHaveBeenCalledTimes(1)
  })

  it('chama uma vez quando aparece e para de observar', () => {
    const io = fakeObserver()
    const onVisible = vi.fn()
    const stop = observeOnce({} as Element, onVisible)
    io.fire(false)
    expect(onVisible).not.toHaveBeenCalled()
    io.fire(true)
    expect(onVisible).toHaveBeenCalledTimes(1)
    expect(io.disconnect).toHaveBeenCalled()
    stop()
  })
})
