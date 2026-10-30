import { describe, expect, it } from 'vitest'
import type { ServerPoint } from '../api/observability'
import { serverSummary } from './serverSummary'

const point = (over: Partial<ServerPoint>): ServerPoint => ({
  at: '2026-10-29T20:00:00Z',
  up: true,
  mbps_in: 0,
  mbps_out: 0,
  loss_in_pct: null,
  loss_out_pct: null,
  rtt_ms: null,
  livekit_cpu_pct: null,
  host_cpu_pct: null,
  host_mem_pct: null,
  participants: 0,
  video_tracks_out: 0,
  ...over
})

describe('serverSummary', () => {
  it('picos e médias do período', () => {
    const s = serverSummary([
      point({ mbps_out: 40, participants: 6, host_cpu_pct: 30, loss_out_pct: 1 }),
      point({ mbps_out: 90, participants: 4, host_cpu_pct: 70, loss_out_pct: 3 }),
      point({ up: false, host_cpu_pct: 10 })
    ])
    expect(s).toEqual({
      peakMbpsOut: 90,
      peakParticipants: 6,
      peakHostCpu: 70,
      avgLossOut: 2,
      liveKitUp: true
    })
  })
  it('sem LiveKit no período', () => {
    expect(serverSummary([point({ up: false })])).toMatchObject({
      liveKitUp: false,
      avgLossOut: null,
      peakHostCpu: null
    })
    expect(serverSummary([]).liveKitUp).toBe(false)
  })
})
