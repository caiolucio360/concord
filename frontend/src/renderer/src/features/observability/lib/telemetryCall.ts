import { num, type Stat } from '../../call/lib/screenStatsFormat'
import {
  countersOf,
  ms,
  n0,
  rttMs,
  transportOf,
  type SampleCounters,
  type SampleResult
} from './telemetrySample'
import { emptySample } from './telemetryTypes'

// Telemetria da voz das calls: o que o servidor diz que recebe de mim (perda,
// jitter), o RTT e o par ICE. Puro.

function remoteInbound(report: RTCStatsReport): Stat | undefined {
  let found: Stat | undefined
  report.forEach((stat: Stat) => {
    if (stat.type === 'remote-inbound-rtp') found ??= stat
  })
  return found
}

function fractionPct(value: unknown): number | null {
  const fraction = num(value)
  return fraction === null ? null : Math.round(fraction * 10000) / 100
}

/** A voz da call: o que o servidor diz que recebe de mim (perda, jitter) e o RTT. */
export function callSample(report: RTCStatsReport, prev: SampleCounters | null): SampleResult {
  const remote = remoteInbound(report)
  const counters = { ...countersOf({}, '', ''), timestamp: n0(remote?.timestamp) }
  const elapsed =
    prev && counters.timestamp > prev.timestamp ? counters.timestamp - prev.timestamp : 0
  return {
    counters,
    sample: {
      ...emptySample(),
      seconds: elapsed / 1000,
      transport: transportOf(report),
      rtt_ms: rttMs(report),
      loss_pct: fractionPct(remote?.fractionLost),
      jitter_ms: ms(remote?.jitter)
    }
  }
}
