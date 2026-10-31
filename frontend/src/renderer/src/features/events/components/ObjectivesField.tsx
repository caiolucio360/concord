import Button from '../../../shared/ui/Button'
import { PlusIcon } from '../../../shared/ui/icons'
import type { ObjectiveInput } from '../api/events'
import { MAX_OBJECTIVES, emptyObjective } from '../lib/objectives'
import ObjectiveRow from './ObjectiveRow'

/** Os objetivos do evento (opcional, até 3): quem confirma presença e cumpre na sala ganha XP. */
export default function ObjectivesField({
  objectives,
  durationMinutes,
  hasGame,
  disabled = false,
  onChange
}: {
  objectives: ObjectiveInput[]
  durationMinutes: number
  hasGame: boolean
  disabled?: boolean
  onChange: (next: ObjectiveInput[]) => void
}): React.JSX.Element {
  const replace = (index: number, next: ObjectiveInput): void =>
    onChange(objectives.map((o, i) => (i === index ? next : o)))
  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className="text-ds-sm font-medium text-secondary">Objetivos (opcional)</legend>
      <p className="text-ds-xs text-muted">
        Quem confirmar presença e cumprir o objetivo na sala do evento ganha XP.
      </p>
      {objectives.map((o, i) => (
        <ObjectiveRow
          key={i}
          index={i}
          objective={o}
          durationMinutes={durationMinutes}
          hasGame={hasGame}
          disabled={disabled}
          onChange={(next) => replace(i, next)}
          onRemove={() => onChange(objectives.filter((_, j) => j !== i))}
        />
      ))}
      {!disabled && objectives.length < MAX_OBJECTIVES && (
        <Button
          type="button"
          variant="ghost"
          icon={PlusIcon}
          className="self-start"
          onClick={() => onChange([...objectives, emptyObjective()])}
        >
          Adicionar objetivo
        </Button>
      )}
    </fieldset>
  )
}
