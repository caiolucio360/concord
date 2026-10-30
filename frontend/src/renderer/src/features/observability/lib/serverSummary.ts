import type { ServerPoint } from '../api/observability'

// Os números de cima da seção do servidor: picos e médias no período. Puro.

export interface ServerSummary {
  peakMbpsOut: number
  peakParticipants: number
  peakHostCpu: number | null
  avgLossOut: number | null
  /** O LiveKit respondeu em algum momento do período. */
  liveKitUp: boolean
}

const present = (values: (number | null)[]): number[] =>
  values.filter((v): v is number => v !== null)

export function serverSummary(points: ServerPoint[]): ServerSummary {
  const up = points.filter((p) => p.up)
  const cpu = present(points.map((p) => p.host_cpu_pct))
  const loss = present(up.map((p) => p.loss_out_pct))
  return {
    peakMbpsOut: Math.max(0, ...up.map((p) => p.mbps_out)),
    peakParticipants: Math.max(0, ...up.map((p) => p.participants)),
    peakHostCpu: cpu.length ? Math.max(...cpu) : null,
    avgLossOut: loss.length ? loss.reduce((a, b) => a + b, 0) / loss.length : null,
    liveKitUp: up.length > 0
  }
}
