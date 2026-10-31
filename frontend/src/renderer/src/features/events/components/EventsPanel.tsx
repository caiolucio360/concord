import { useMemo, useState } from 'react'
import Modal from '../../../shared/ui/Modal'
import { useServerStore } from '../../servers/store/serverStore'
import type { ServerEvent } from '../api/events'
import { useEvents } from '../hooks/useEvents'
import { eventErrorMessage } from '../lib/eventErrors'
import { useEventsStore } from '../store/eventsStore'
import EventForm from './EventForm'
import EventsPanelBody from './EventsPanelBody'

/** O painel de eventos de um servidor: lista, detalhe, presença e (com permissão) criar, editar e cancelar. */
export default function EventsPanel({
  serverId,
  canManage,
  onClose
}: {
  serverId: string
  canManage: boolean
  onClose: () => void
}): React.JSX.Element {
  const { events, error, reload } = useEvents(serverId)
  const channels = useServerStore((s) => s.channels)
  const voiceChannels = useMemo(() => channels.filter((c) => c.type === 'voice'), [channels])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<ServerEvent | 'new' | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async (action: () => Promise<void>): Promise<void> => {
    setNotice(null)
    setBusy(true)
    try {
      await action()
    } catch (err) {
      setNotice(eventErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open xl title="Eventos" onClose={onClose}>
      {notice && (
        <div role="alert" className="mb-3 rounded-lg border border-danger/20 bg-danger/10 p-2.5 text-ds-xs text-danger">
          {notice}
        </div>
      )}
      <EventsPanelBody
        serverId={serverId}
        events={events}
        error={error}
        canManage={canManage}
        channels={channels}
        selectedId={selectedId}
        busy={busy}
        onSelect={setSelectedId}
        onCreate={() => setEditing('new')}
        onEdit={setEditing}
        onRetry={reload}
        onRespond={(id, going) => void run(() => useEventsStore.getState().respond(serverId, id, going))}
        onCancelEvent={(id) =>
          void run(async () => {
            await useEventsStore.getState().cancel(serverId, id)
            setSelectedId(null)
          })
        }
      />
      {editing && (
        <EventForm
          serverId={serverId}
          event={editing === 'new' ? undefined : editing}
          voiceChannels={voiceChannels}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setEditing(null)
            setSelectedId(saved.id)
          }}
        />
      )}
    </Modal>
  )
}
