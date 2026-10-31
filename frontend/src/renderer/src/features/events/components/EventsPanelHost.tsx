import { useEventsPanelStore } from '../store/eventsPanelStore'
import EventsPanel from './EventsPanel'

/** Monta o painel de eventos quando o menu do servidor o abriu para este servidor. */
export default function EventsPanelHost({
  serverId,
  canManage
}: {
  serverId: string | undefined
  canManage: boolean
}): React.JSX.Element | null {
  const openFor = useEventsPanelStore((s) => s.serverId)
  const close = useEventsPanelStore((s) => s.close)
  if (!serverId || openFor !== serverId) return null
  return <EventsPanel serverId={serverId} canManage={canManage} onClose={close} />
}
