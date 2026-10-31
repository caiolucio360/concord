import { progressPercent } from '../lib/objectives'

/** A barra de progresso de um objetivo (ocupa a largura toda). */
export default function ObjectiveBar({
  minutes,
  goal,
  label
}: {
  minutes: number
  goal: number
  label: string
}): React.JSX.Element {
  const percent = progressPercent(minutes, goal)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-2 w-full overflow-hidden rounded-full bg-fg/10"
    >
      <div className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} />
    </div>
  )
}
