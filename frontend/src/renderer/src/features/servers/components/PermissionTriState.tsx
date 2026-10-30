import type { TriState } from '../lib/channelPermissions'

export const TRI_STATES: { id: TriState; label: string; symbol: string; active: string }[] = [
  { id: 'deny', label: 'Negar', symbol: '✗', active: 'bg-danger-strong text-white' },
  { id: 'inherit', label: 'Herdar do servidor', symbol: '/', active: 'bg-fg/25 text-strong' },
  { id: 'allow', label: 'Permitir', symbol: '✓', active: 'bg-success-strong text-white' }
]

/** Negar / herdar / permitir uma permissão, lado a lado (o padrão do Discord). */
function PermissionTriState({
  label,
  state,
  disabled,
  onChange
}: {
  label: string
  state: TriState
  disabled: boolean
  onChange: (state: TriState) => void
}): React.JSX.Element {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex shrink-0 overflow-hidden rounded-md border border-normal"
    >
      {TRI_STATES.map((s) => (
        <button
          key={s.id}
          type="button"
          disabled={disabled}
          aria-label={`${label}: ${s.label}`}
          aria-pressed={state === s.id}
          title={s.label}
          onClick={() => onChange(s.id)}
          className={`h-7 w-8 cursor-pointer text-sm font-bold transition-colors disabled:cursor-not-allowed ${
            state === s.id ? s.active : 'text-gray-400 hover:bg-fg/10'
          }`}
        >
          {s.symbol}
        </button>
      ))}
    </div>
  )
}

export default PermissionTriState
