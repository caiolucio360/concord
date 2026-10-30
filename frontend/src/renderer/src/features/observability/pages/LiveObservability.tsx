import { useState } from 'react'
import Button from '../../../shared/ui/Button'
import { BreakdownTables } from '../components/BreakdownTables'
import { LivesTable } from '../components/LivesTable'
import { RecentEvents } from '../components/RecentEvents'
import { ServerSection } from '../components/ServerSection'
import { WorstSessions } from '../components/WorstSessions'
import { useLiveReport, type ReportState } from '../hooks/useLiveReport'

const PERIODS = [1, 3, 7, 14]

export function LiveReportBody({
  state,
  onRetry
}: {
  state: ReportState
  onRetry: () => void
}): React.JSX.Element {
  if (state.status === 'loading') return <p className="text-ds-sm text-gray-400">Carregando…</p>
  if (state.status === 'forbidden') {
    return <p className="text-ds-sm text-gray-400">Só os devs do Salinha veem esta página.</p>
  }
  if (state.status === 'error') {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-ds-sm text-danger">Não foi possível carregar o painel.</p>
        <Button variant="ghost" onClick={onRetry}>
          Tentar de novo
        </Button>
      </div>
    )
  }
  const { report } = state
  return (
    <>
      <ServerSection points={report.server} />
      <LivesTable rows={report.lives} />
      <WorstSessions rows={report.worst} />
      <BreakdownTables breakdown={report.breakdown} />
      <RecentEvents events={report.events} />
    </>
  )
}

/**
 * Observabilidade das lives (só devs, sem link no app: /observabilidade).
 * Ver docs/OBSERVABILIDADE.md e docs/adr/0029-observabilidade-das-lives.md.
 */
function LiveObservability(): React.JSX.Element {
  const [days, setDays] = useState(7)
  const { state, reload } = useLiveReport(days)
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-primary text-gray-100">
      <header className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-subtle px-4 py-2">
        <h1 className="text-base font-semibold">Observabilidade das lives</h1>
        <div role="group" aria-label="Período" className="flex gap-1">
          {PERIODS.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={d === days}
              onClick={() => setDays(d)}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-ds-sm font-medium transition-colors ${
                d === days ? 'bg-brand text-white' : 'bg-fg/10 text-gray-200 hover:bg-fg/15'
              }`}
            >
              {d === 1 ? '24 h' : `${d} dias`}
            </button>
          ))}
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <LiveReportBody state={state} onRetry={reload} />
        </div>
      </main>
    </div>
  )
}

export default LiveObservability
