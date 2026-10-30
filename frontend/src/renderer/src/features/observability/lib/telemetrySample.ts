import { videoRtp, type ScreenStatsInput } from '../../call/lib/screenStats'
import { encoderInfoFromReport } from '../../call/lib/screenEncoderInfo'
import {
  codecSubtype,
  implementationKind,
  num,
  text,
  type Stat
} from '../../call/lib/screenStatsFormat'
import { emptySample, type TelemetrySample } from './telemetryTypes'

// Telemetria das lives e calls: transforma o getStats() (o mesmo que o painel
// da live lê) numa amostra pequena para o backend. Contadores vão como a
// diferença desde a leitura anterior; a primeira leitura é só a base. Puro.

/** O que a próxima leitura precisa para calcular as diferenças. */
export interface SampleCounters {
  timestamp: number
  bytes: number
  keyFrames: number
  pli: number
  nack: number
  freezes: number
  freezeMs: number
  dropped: number
  lost: number
  received: number
}

export interface SampleResult {
  sample: TelemetrySample
  counters: SampleCounters
}

export const n0 = (value: unknown): number => num(value) ?? 0

export function countersOf(stat: Stat, bytesKey: string, keyFramesKey: string): SampleCounters {
  return {
    timestamp: n0(stat.timestamp),
    bytes: n0(stat[bytesKey]),
    keyFrames: n0(stat[keyFramesKey]),
    pli: n0(stat.pliCount) + n0(stat.firCount),
    nack: n0(stat.nackCount),
    freezes: n0(stat.freezeCount),
    freezeMs: Math.round(n0(stat.totalFreezesDuration) * 1000),
    dropped: n0(stat.framesDropped),
    lost: n0(stat.packetsLost),
    received: n0(stat.packetsReceived)
  }
}

type Deltas = Record<keyof SampleCounters, number>

/** Diferenças no intervalo (zeros na primeira leitura; contador que voltou = 0). */
function deltas(now: SampleCounters, prev: SampleCounters | null): Deltas {
  const out = {} as Deltas
  for (const key of Object.keys(now) as (keyof SampleCounters)[]) {
    out[key] = prev ? Math.max(0, now[key] - prev[key]) : 0
  }
  return out
}

function bitrateKbps(d: Deltas): number | null {
  return d.timestamp > 0 ? Math.round((d.bytes * 8) / d.timestamp) : null
}

function lossPct(d: Deltas): number | null {
  const total = d.lost + d.received
  return total > 0 ? Math.round((d.lost * 10000) / total) / 100 : null
}

export const ms = (seconds: unknown): number | null => {
  const value = num(seconds)
  return value === null ? null : Math.round(value * 1000)
}

/** Par ICE escolhido: udp, tcp ou relay (TURN); '' sem dado. */
export function transportOf(report: RTCStatsReport): string {
  const pair = selectedPair(report)
  const local =
    typeof pair?.localCandidateId === 'string'
      ? (report.get(pair.localCandidateId) as Stat | undefined)
      : undefined
  if (local?.candidateType === 'relay') return 'relay'
  return text(local?.protocol) ?? ''
}

function selectedPair(report: RTCStatsReport): Stat | undefined {
  let selected: Stat | undefined
  let nominated: Stat | undefined
  report.forEach((stat: Stat) => {
    if (stat.type === 'transport' && typeof stat.selectedCandidatePairId === 'string') {
      selected = report.get(stat.selectedCandidatePairId) as Stat | undefined
    }
    if (stat.type === 'candidate-pair' && stat.nominated && stat.state === 'succeeded')
      nominated = stat
  })
  return selected ?? nominated
}

export function rttMs(report: RTCStatsReport): number | null {
  return ms(selectedPair(report)?.currentRoundTripTime)
}

function hardwareOf(stat: Stat, nameKey: string, efficientKey: string): boolean | null {
  const kind = implementationKind(
    text(stat[nameKey]) ?? '',
    stat[efficientKey] as boolean | undefined
  )
  return kind === null ? null : kind === 'Hardware'
}

/** "1080p 60" → 1080 e 60 (o que a pessoa escolheu). */
function chosenTarget(label: string | undefined): { height: number | null; fps: number | null } {
  const match = /(\d+)p (\d+)/.exec(label ?? '')
  return match ? { height: Number(match[1]), fps: Number(match[2]) } : { height: null, fps: null }
}

/** Camadas do principal saindo (com a extra de 720p, 2) e se a reserva está saindo. */
function layersOf(report: RTCStatsReport, primary: string): { layers: number; backup: boolean } {
  let layers = 0
  report.forEach((stat: Stat) => {
    if (stat.type === 'outbound-rtp' && stat.kind === 'video' && stat.active !== false) {
      if (codecSubtype(report, stat) === primary) layers++
    }
  })
  const backup = encoderInfoFromReport(report, null, primary).encoders.some((e) => e.backup)
  return { layers, backup }
}

function videoBase(stat: Stat, report: RTCStatsReport, d: Deltas): TelemetrySample {
  return {
    ...emptySample(),
    seconds: d.timestamp / 1000,
    codec: codecSubtype(report, stat) ?? '',
    width: num(stat.frameWidth),
    height: num(stat.frameHeight),
    fps: num(stat.framesPerSecond),
    bitrate_kbps: bitrateKbps(d),
    key_frames: d.keyFrames,
    pli: d.pli,
    nack: d.nack,
    transport: transportOf(report),
    rtt_ms: rttMs(report)
  }
}

/** A minha live. `stepChanges`: trocas de degrau desde a última amostra. */
export function shareSample(
  input: ScreenStatsInput,
  prev: SampleCounters | null,
  stepChanges: number
): SampleResult | null {
  const stat = videoRtp(input.report, 'outbound-rtp', 'bytesSent')
  if (!stat) return null
  const counters = countersOf(stat, 'bytesSent', 'keyFramesEncoded')
  const base = videoBase(stat, input.report, deltas(counters, prev))
  const target = chosenTarget(input.quality?.chosen)
  return {
    counters,
    sample: {
      ...base,
      ...layersOf(input.report, base.codec),
      hardware: hardwareOf(stat, 'encoderImplementation', 'powerEfficientEncoder'),
      target_height: target.height,
      target_fps: target.fps ?? input.requestedFps,
      limitation: text(stat.qualityLimitationReason) ?? '',
      step: input.quality?.step ?? null,
      step_changes: stepChanges
    }
  }
}

/** A live de outra pessoa que estou assistindo. */
export function watchSample(
  input: ScreenStatsInput,
  prev: SampleCounters | null
): SampleResult | null {
  const stat = videoRtp(input.report, 'inbound-rtp', 'bytesReceived')
  if (!stat) return null
  const counters = countersOf(stat, 'bytesReceived', 'keyFramesDecoded')
  const d = deltas(counters, prev)
  return {
    counters,
    sample: {
      ...videoBase(stat, input.report, d),
      hardware: hardwareOf(stat, 'decoderImplementation', 'powerEfficientDecoder'),
      loss_pct: lossPct(d),
      jitter_ms: ms(stat.jitter),
      freezes: d.freezes,
      freeze_ms: d.freezeMs,
      frames_dropped: d.dropped,
      paused: input.streamState === 'paused'
    }
  }
}
