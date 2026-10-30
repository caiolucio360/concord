import { describe, expect, it, vi } from 'vitest'
import { sameScreenQuality, ScreenQualityQueue, type ScreenQualityRequest } from './screenQualityQueue'
import type { ScreenShareQuality } from './screenShareQuality'

const Q720: ScreenShareQuality = { resolution: '720p', frameRate: 30 }
const Q1080: ScreenShareQuality = { resolution: '1080p', frameRate: 60 }

function connection() {
  const calls: ScreenShareQuality[] = []
  let release: () => void = () => {}
  return {
    calls,
    release: () => release(),
    updateScreenQuality: vi.fn(async (_stream: MediaStream, quality: ScreenShareQuality) => {
      calls.push(quality)
      await new Promise<void>((resolve) => (release = resolve))
    })
  }
}

type Conn = ReturnType<typeof connection>
const request = (conn: Conn, quality: ScreenShareQuality): ScreenQualityRequest<Conn> => ({
  stream: {} as MediaStream,
  connection: conn,
  callId: 'c1',
  quality
})

describe('ScreenQualityQueue', () => {
  it('uma troca de cada vez; cliques no meio: só o último vai', async () => {
    const conn = connection()
    const applied = vi.fn()
    const idle = vi.fn()
    const queue = new ScreenQualityQueue<Conn>({ isCurrent: () => true, applied, failed: vi.fn(), idle })
    queue.push(request(conn, Q720))
    queue.push(request(conn, Q1080))
    queue.push(request(conn, Q720))
    expect(conn.calls).toEqual([Q720])
    conn.release()
    await vi.waitFor(() => expect(conn.calls).toEqual([Q720, Q720]))
    conn.release()
    await vi.waitFor(() => expect(idle).toHaveBeenCalled())
    expect(applied).toHaveBeenCalledTimes(2)
  })

  it('a live mudou no meio: não aplica nem avisa erro', async () => {
    const conn = connection()
    conn.updateScreenQuality.mockRejectedValueOnce(new Error('x'))
    const failed = vi.fn()
    const applied = vi.fn()
    const queue = new ScreenQualityQueue<Conn>({ isCurrent: () => false, applied, failed, idle: vi.fn() })
    queue.push(request(conn, Q720))
    await Promise.resolve()
    expect(conn.updateScreenQuality).not.toHaveBeenCalled()
    expect(applied).not.toHaveBeenCalled()
  })

  it('falhou com a live ainda valendo: avisa', async () => {
    const conn = connection()
    conn.updateScreenQuality.mockRejectedValueOnce(new Error('x'))
    const failed = vi.fn()
    const idle = vi.fn()
    const queue = new ScreenQualityQueue<Conn>({ isCurrent: () => true, applied: vi.fn(), failed, idle })
    queue.push(request(conn, Q720))
    await vi.waitFor(() => expect(idle).toHaveBeenCalled())
    expect(failed).toHaveBeenCalled()
  })

  it('clear tira o que esperava a vez', async () => {
    const conn = connection()
    const queue = new ScreenQualityQueue<Conn>({ isCurrent: () => true, applied: vi.fn(), failed: vi.fn(), idle: vi.fn() })
    queue.push(request(conn, Q720))
    queue.push(request(conn, Q1080))
    queue.clear()
    conn.release()
    await Promise.resolve()
    await Promise.resolve()
    expect(conn.calls).toEqual([Q720])
  })

  it('mesma qualidade', () => {
    expect(sameScreenQuality(Q720, { ...Q720 })).toBe(true)
    expect(sameScreenQuality(null, Q720)).toBe(false)
    expect(sameScreenQuality(Q720, Q1080)).toBe(false)
  })
})
