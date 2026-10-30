import { useEffect } from 'react'
import { useCallStore } from '../../call/store/callStore'
import { useScreenAdaptStore } from '../../call/store/screenAdaptStore'
import { readActiveCallStats, readActiveScreenStats } from '../../call/lib/screenStatsSource'
import { anonymousGuestLink, useGuestSessionStore } from '../../guests/store/guestSessionStore'
import { postTelemetry } from '../api/telemetry'
import { loadClientContext } from '../lib/telemetryContext'
import {
  createTelemetryReporter,
  stepChanged,
  TELEMETRY_INTERVAL_MS,
  type CallSnapshot
} from '../lib/telemetryReporter'

/** Visitante sem conta não manda (o servidor recusaria o token e derrubaria a visita). */
function snapshot(): CallSnapshot {
  const call = useCallStore.getState()
  const guest = anonymousGuestLink(useGuestSessionStore.getState()) !== null
  return {
    callId: call.status === 'active' && !guest ? call.callId : null,
    sharing: call.isScreenSharing,
    watching: call.watchedScreenIds
  }
}

/**
 * Telemetria das lives e calls (docs/adr/0028): a cada 20 s, com uma call
 * ativa, manda ao servidor o resumo técnico de cada sessão. Fora de call não
 * lê nem manda nada.
 */
function LiveTelemetryBridge(): null {
  useEffect(() => {
    const reporter = createTelemetryReporter({
      snapshot,
      readScreen: readActiveScreenStats,
      readCall: readActiveCallStats,
      context: loadClientContext,
      send: postTelemetry,
      newId: () => crypto.randomUUID()
    })
    const timer = setInterval(() => void reporter.tick(), TELEMETRY_INTERVAL_MS)
    const offAdapt = useScreenAdaptStore.subscribe((state, previous) => {
      if (stepChanged(previous.view, state.view)) reporter.noteStepChange()
    })
    return () => {
      clearInterval(timer)
      offAdapt()
    }
  }, [])
  return null
}

export default LiveTelemetryBridge
