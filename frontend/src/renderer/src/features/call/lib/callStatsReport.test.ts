import { describe, expect, it, vi } from 'vitest'

vi.mock('livekit-client', () => ({
  Track: { Source: { Microphone: 'microphone' } }
}))

import { readCallReport, type CallStatsRoom } from './callStatsReport'

const mine = new Map([['a', { type: 'outbound-rtp' }]]) as unknown as RTCStatsReport
const theirs = new Map([['b', { type: 'inbound-rtp' }]]) as unknown as RTCStatsReport

const track = (report: RTCStatsReport | undefined) => ({
  track: { getRTCStatsReport: async () => report }
})

function room(local?: RTCStatsReport, remote: (RTCStatsReport | undefined)[] = []): CallStatsRoom {
  return {
    localParticipant: { getTrackPublication: () => (local ? track(local) : undefined) },
    remoteParticipants: new Map(
      remote.map((r, i) => [String(i), { getTrackPublication: () => (r ? track(r) : undefined) }])
    )
  }
}

describe('readCallReport', () => {
  it('prefere o meu microfone', async () => {
    expect(await readCallReport(room(mine, [theirs]))).toBe(mine)
  })
  it('só ouvindo: o microfone de alguém', async () => {
    expect(await readCallReport(room(undefined, [undefined, theirs]))).toBe(theirs)
  })
  it('ninguém com microfone: null', async () => {
    expect(await readCallReport(room())).toBeNull()
  })
  it('track removida no meio da leitura: tenta a próxima', async () => {
    const r = room(undefined, [theirs])
    r.localParticipant.getTrackPublication = () => ({
      track: {
        getRTCStatsReport: async () => {
          throw new Error('removida')
        }
      }
    })
    expect(await readCallReport(r)).toBe(theirs)
  })
})
