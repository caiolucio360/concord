import type { ComponentType } from 'react'
import type { TriState } from '../lib/channelPermissions'
import { CheckIcon, SlashIcon, XIcon, type IconProps } from '../../../shared/ui/icons'

export const TRI_STATES: {
  id: TriState
  label: string
  icon: ComponentType<IconProps>
  active: string
}[] = [
  { id: 'deny', label: 'Negar', icon: XIcon, active: 'bg-danger-strong text-white' },
  { id: 'inherit', label: 'Herdar do servidor', icon: SlashIcon, active: 'bg-fg/25 text-strong' },
  { id: 'allow', label: 'Permitir', icon: CheckIcon, active: 'bg-success-strong text-white' }
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
          className={`focus-ring-inset flex h-8 w-9 cursor-pointer items-center justify-center transition-colors disabled:cursor-not-allowed ${
            state === s.id ? s.active : 'text-interactive-normal hover:bg-fg/10 hover:text-interactive-hover'
          }`}
        >
          <s.icon size={16} />
        </button>
      ))}
    </div>
  )
}

export default PermissionTriState
