import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { LiveReport, SessionStats } from '../api/observability'
import type { ReportState } from '../hooks/useLiveReport'
import { LiveReportBody } from './LiveObservability'

const base: SessionStats = {
  id: 's1',
  user_id: 'u1',
  username: 'ana',
  kind: 'transmite',
  call_id: 'c1',
  streamer_id: '',
  os: 'Windows',
  gpu: 'ANGLE (NVIDIA)',
  app_version: '1.0.0',
  target: 'desktop',
  cores: 8,
  started_at: '2026-10-29T20:00:00Z',
  ended_at: '2026-10-29T20:30:00Z',
  seconds: 1800,
  codec: 'H265',
  transport: 'udp',
  fps: 55,
  target_fps: 60,
  height: 1080,
  hardware_ratio: 1,
  below_ratio: 0.25,
  cpu_ratio: 0.4,
  bandwidth_ratio: 0,
  backup_ratio: 0,
  paused_ratio: 0,
  freezes: 0,
  freeze_ms: 0,
  step_changes: 2,
  bitrate_kbps: 6000,
  loss_pct: 0.1,
  rtt_ms: 30
}

const report = (up: boolean): LiveReport => ({
  from: '2026-10-22T20:00:00Z',
  to: '2026-10-29T20:00:00Z',
  bucket_minutes: 60,
  server: [
    {
      at: '2026-10-29T20:00:00Z',
      up,
      mbps_in: 6,
      mbps_out: 24,
      loss_in_pct: 0,
      loss_out_pct: 0.5,
      rtt_ms: 30,
      livekit_cpu_pct: 20,
      host_cpu_pct: 35,
      host_mem_pct: 60,
      participants: 5,
      video_tracks_out: 4
    }
  ],
  lives: [
    {
      ...base,
      duration_seconds: 1800,
      viewers: 3,
      viewer_freezes_per_min: 0.4,
      viewer_software_ratio: 0.33
    }
  ],
  worst: [
    {
      ...base,
      id: 'w1',
      kind: 'assiste',
      username: 'bia',
      duration_seconds: 600,
      freezes_per_min: 2,
      score: 80,
      reasons: ['Decodificando no processador']
    }
  ],
  breakdown: {
    os: [
      { key: 'Windows', sessions: 2, below_ratio: 0.25, freezes_per_min: 0.4, software_ratio: 0 }
    ],
    gpu: [],
    codec: [],
    transport: []
  },
  events: [
    {
      at: '2026-10-29T20:10:00Z',
      type: 'degrau_caiu',
      detail: '0 → 1 (cpu)',
      kind: 'transmite',
      username: 'ana'
    }
  ]
})

const render = (state: ReportState): string =>
  renderToStaticMarkup(<LiveReportBody state={state} onRetry={() => {}} />)

describe('LiveReportBody', () => {
  it('mostra servidor, lives, piores, distribuição e eventos', () => {
    const html = render({ status: 'ready', report: report(true) })
    for (const text of [
      'Pico de saída',
      '24 Mbps',
      'Lives recentes',
      'ana',
      'CPU 40%',
      'Piores sessões e por quê',
      'Decodificando no processador',
      'Distribuição',
      'Qualidade caiu',
      '0 → 1 (cpu)'
    ]) {
      expect(html).toContain(text)
    }
    expect(html).not.toContain('não mandou métricas')
  })
  it('avisa quando o LiveKit não mandou métricas', () => {
    expect(render({ status: 'ready', report: report(false) })).toContain('não mandou métricas')
  })
  it('estados: carregando, sem permissão e erro', () => {
    expect(render({ status: 'loading' })).toContain('Carregando')
    expect(render({ status: 'forbidden' })).toContain('Só os devs')
    expect(render({ status: 'error' })).toContain('Tentar de novo')
  })
})
