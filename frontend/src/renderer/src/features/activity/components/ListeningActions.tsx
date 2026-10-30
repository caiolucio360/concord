import { useCallStore } from '../../call/store/callStore'
import { listeningLinks } from '../lib/listeningLinks'
import type { ListeningActivity } from '../lib/listeningActivity'
import { queueListening } from '../lib/queueListening'
import { queueTarget } from '../lib/queueTarget'
import MusicIcon from './MusicIcon'
import { PlusIcon } from '../../../shared/ui/icons'

const itemClass =
  'focus-ring flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-left text-ds-sm text-normal transition-colors hover:bg-fg/10 disabled:cursor-not-allowed disabled:opacity-50'

/** Menu "Ouvir também" de uma faixa: abrir em outro serviço ou pôr na fila do Maestro da minha call. */
export function ListeningActions({
  listening,
  id
}: {
  listening: ListeningActivity
  id: string
}): React.JSX.Element {
  const status = useCallStore((s) => s.status)
  const type = useCallStore((s) => s.type)
  const serverId = useCallStore((s) => s.serverId)
  const target = queueTarget({ status, type, serverId })
  const reason = 'reason' in target ? target.reason : null
  return (
    <div id={id} role="menu" aria-label="Ouvir também" className="mt-2 flex flex-col gap-0.5">
      {listeningLinks(listening).map((link) => (
        <a
          key={link.label}
          role="menuitem"
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className={itemClass}
        >
          <MusicIcon app={link.label} className="h-4 w-4" />
          Ouvir no {link.label}
        </a>
      ))}
      <button
        type="button"
        role="menuitem"
        disabled={reason !== null}
        aria-describedby={reason ? `${id}-motivo` : undefined}
        onClick={() => void queueListening(target, listening)}
        className={itemClass}
      >
        <PlusIcon size={16} className="shrink-0" />
        Adicionar à fila do Maestro
      </button>
      {reason && (
        <p id={`${id}-motivo`} className="px-2.5 text-ds-xs text-muted">
          {reason}
        </p>
      )}
    </div>
  )
}
