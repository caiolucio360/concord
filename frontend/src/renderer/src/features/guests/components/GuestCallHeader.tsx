import { useNow } from '../../../shared/hooks/useNow'
import { XIcon } from '../../../shared/ui/icons'
import { GUEST_COPY } from '../lib/guestCopy'
import { timeLeftLabel } from '../lib/guestTime'
import type { GuestPass } from '../api/guestInvites'
import GuestBadge from './GuestBadge'
import IconButton from '../../../shared/ui/IconButton'

/**
 * O topo da call de visitante: canal, servidor, selo e quanto falta do acesso.
 * `onClose`: o X de sair (visitante sem conta, que não tem o resto do app).
 */
function GuestCallHeader({
  pass,
  onClose
}: {
  pass: GuestPass
  onClose?: () => void
}): React.JSX.Element {
  const now = useNow(30_000)
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-subtle px-4 py-3">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-ds-md font-bold text-strong">{pass.channel_name}</h1>
        <p className="truncate text-ds-xs text-muted">{pass.server_name}</p>
      </div>
      <GuestBadge />
      <span className="text-ds-xs text-secondary">
        {GUEST_COPY.timeLeft(timeLeftLabel(pass.expires_at, now))}
      </span>
      {onClose && (
        <IconButton icon={XIcon} label={GUEST_COPY.closeLabel} onClick={onClose} size="sm" className="-mr-1" />
      )}
    </header>
  )
}

export default GuestCallHeader
