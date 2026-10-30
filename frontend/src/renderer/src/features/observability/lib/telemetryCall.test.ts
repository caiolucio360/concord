import { describe, expect, it } from 'vitest'
import { callSample } from './telemetryCall'

const report = (stats: Record<string, Record<string, unknown>>): RTCStatsReport =>
  new Map(Object.entries(stats).map(([id, s]) => [id, { id, ...s }])) as unknown as RTCStatsReport

describe('callSample', () => {
  it('voz: RTT, perda e jitter vistos pelo servidor e o transporte', () => {
    const r = report({
      t1: { type: 'transport', selectedCandidatePairId: 'p1' },
      p1: { type: 'candidate-pair', localCandidateId: 'l1', currentRoundTripTime: 0.08 },
      l1: { type: 'local-candidate', protocol: 'udp', candidateType: 'relay' },
      r1: {
        type: 'remote-inbound-rtp',
        kind: 'audio',
        fractionLost: 0.05,
        jitter: 0.02,
        timestamp: 5000
      }
    })
    expect(callSample(r, null).sample).toMatchObject({
      transport: 'relay',
      rtt_ms: 80,
      loss_pct: 5,
      jitter_ms: 20,
      codec: '',
      seconds: 0
    })
  })

  it('sem relatório: amostra vazia com o intervalo', () => {
    const first = callSample(report({}), null)
    expect(first.sample).toMatchObject({ transport: '', rtt_ms: null, loss_pct: null })
  })
})
