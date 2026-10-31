import { CheckIcon } from '../../../shared/ui/icons'
import type { EventObjective } from '../api/events'
import { formatXp, objectiveTitle } from '../lib/objectives'
import ObjectiveBar from './ObjectiveBar'

/** Os objetivos do evento no detalhe, com o meu progresso na ocorrência atual. */
export default function ObjectivesList({
  objectives,
  game,
  going
}: {
  objectives: EventObjective[]
  game: string | null
  going: boolean
}): React.JSX.Element | null {
  if (objectives.length === 0) return null
  return (
    <section aria-label="Objetivos" className="flex min-w-0 flex-col gap-3">
      <h4 className="text-ds-md font-semibold text-strong">Objetivos</h4>
      {!going && (
        <p className="text-ds-xs text-muted">Confirme presença para ganhar XP com os objetivos.</p>
      )}
      <ul className="flex flex-col gap-3">
        {objectives.map((o) => {
          const title = objectiveTitle(o, game)
          return (
            <li key={o.id} className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-subtle bg-fg/5 p-3">
              <p className="min-w-0 break-words text-ds-sm text-normal">{title}</p>
              <p className="text-ds-xs tabular-nums text-secondary">{`+${formatXp(o.xp)} XP`}</p>
              <ObjectiveBar minutes={o.my_minutes} goal={o.minutes} label={title} />
              {o.my_done ? (
                <p className="flex items-center gap-1 text-ds-xs text-success">
                  <CheckIcon size={16} />
                  Cumprido
                </p>
              ) : (
                <p className="text-ds-xs tabular-nums text-muted">{`${o.my_minutes} de ${o.minutes} min`}</p>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
