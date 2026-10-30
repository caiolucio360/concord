import { Track } from 'livekit-client'

// getStats() da voz da chamada, para a telemetria das calls: o meu microfone
// (RTT, perda e jitter vistos pelo servidor, par ICE: UDP, TCP ou TURN) e a
// voz de cada pessoa que eu ouço (áudio sintetizado, perda até mim), num
// relatório só. Puro sobre a sala.

interface StatsPublication {
  track?: { getRTCStatsReport(): Promise<RTCStatsReport | undefined> }
}

export interface CallStatsRoom {
  localParticipant: { getTrackPublication(source: Track.Source): StatsPublication | undefined }
  remoteParticipants: Map<
    string,
    { getTrackPublication(source: Track.Source): StatsPublication | undefined }
  >
}

async function reportOf(publication: StatsPublication | undefined): Promise<RTCStatsReport | null> {
  try {
    return (await publication?.track?.getRTCStatsReport()) ?? null
  } catch {
    // Track removida durante a leitura.
    return null
  }
}

export async function readCallReport(room: CallStatsRoom): Promise<RTCStatsReport | null> {
  const publications = [
    room.localParticipant.getTrackPublication(Track.Source.Microphone),
    ...[...room.remoteParticipants.values()].map((p) =>
      p.getTrackPublication(Track.Source.Microphone)
    )
  ]
  const reports = await Promise.all(publications.map(reportOf))
  const merged = new Map<string, unknown>()
  reports.forEach((report) => report?.forEach((stat, id) => merged.set(id, stat)))
  return merged.size > 0 ? (merged as unknown as RTCStatsReport) : null
}
