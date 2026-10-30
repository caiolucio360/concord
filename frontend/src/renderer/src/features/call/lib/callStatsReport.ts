import { Track } from 'livekit-client'

// getStats() da voz da chamada, para a telemetria das calls (RTT, perda,
// jitter e o par ICE: UDP, TCP ou TURN). O meu microfone; só ouvindo, o de
// alguém (o transporte é o mesmo). Puro sobre a sala.

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
  for (const publication of publications) {
    const report = await reportOf(publication)
    if (report) return report
  }
  return null
}
