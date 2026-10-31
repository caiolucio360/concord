import IconButton from '../../../shared/ui/IconButton'
import { TrashIcon } from '../../../shared/ui/icons'
import type { ObjectiveInput } from '../api/events'
import { DIFFICULTIES, KINDS, minutesOptions } from '../lib/objectives'

const LABEL = 'flex min-w-0 flex-col gap-1.5 text-ds-sm font-medium text-secondary'

/**
 * Uma linha do formulário: tipo, dificuldade e meta de um objetivo. Coluna no
 * celular; de 768 px em diante, os três campos lado a lado.
 */
export default function ObjectiveRow({
  index,
  objective,
  durationMinutes,
  hasGame,
  disabled = false,
  onChange,
  onRemove
}: {
  index: number
  objective: ObjectiveInput
  durationMinutes: number
  hasGame: boolean
  disabled?: boolean
  onChange: (next: ObjectiveInput) => void
  onRemove: () => void
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-subtle bg-fg/5 p-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <label className={`${LABEL} md:flex-1`}>
          Tipo
          <select
            name={`objective-kind-${index}`}
            disabled={disabled}
            className="glass-input"
            value={objective.kind}
            onChange={(e) => onChange({ ...objective, kind: e.target.value as ObjectiveInput['kind'] })}
          >
            {KINDS.map((k) => (
              <option key={k.value} value={k.value} disabled={k.value === 'game' && !hasGame} className="bg-floating">
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <label className={`${LABEL} md:flex-1`}>
          Dificuldade
          <select
            name={`objective-difficulty-${index}`}
            disabled={disabled}
            className="glass-input"
            value={objective.difficulty}
            onChange={(e) =>
              onChange({ ...objective, difficulty: e.target.value as ObjectiveInput['difficulty'] })
            }
          >
            {DIFFICULTIES.map((d) => (
              <option key={d.value} value={d.value} className="bg-floating">
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className={`${LABEL} md:w-32`}>
          Meta
          <select
            name={`objective-minutes-${index}`}
            disabled={disabled}
            className="glass-input"
            value={objective.minutes}
            onChange={(e) => onChange({ ...objective, minutes: Number(e.target.value) })}
          >
            {minutesOptions(durationMinutes).map((m) => (
              <option key={m} value={m} className="bg-floating">
                {`${m} min`}
              </option>
            ))}
          </select>
        </label>
        {!disabled && (
          <IconButton
            icon={TrashIcon}
            label="Remover objetivo"
            className="self-end md:self-auto"
            onClick={onRemove}
          />
        )}
      </div>
      {!hasGame && <p className="text-ds-xs text-muted">Escolha um jogo para o evento.</p>}
      {objective.kind === 'game' && (
        <p className="text-ds-xs text-muted">Conta só para quem usa o app para Windows.</p>
      )}
    </div>
  )
}
