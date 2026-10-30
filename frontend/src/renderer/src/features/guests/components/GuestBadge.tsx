import { GUEST_COPY } from '../lib/guestCopy'

/** Selo "Visitante" ao lado do nome de quem entrou por um link de visitante. */
function GuestBadge({ className = '' }: { className?: string }): React.JSX.Element {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-sm bg-warning/15 px-1.5 py-px text-ds-xxs font-bold uppercase tracking-wide text-warning ${className}`}
    >
      {GUEST_COPY.badge}
    </span>
  )
}

export default GuestBadge
