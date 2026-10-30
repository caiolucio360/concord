import { useShallow } from 'zustand/react/shallow'
import { useLocation, useNavigate } from 'react-router-dom'
import { useCallStore } from '../../call/store/callStore'
import { voiceServerId } from '../../call/lib/voiceServer'
import ServerRailItem from '../../servers/components/ServerRailItem'
import { useServerStore } from '../../servers/store/serverStore'
import { GUEST_COPY } from '../lib/guestCopy'
import { visitPath, visitsOutsideServers } from '../lib/guestVisits'
import { useLiveVisits } from '../hooks/useGuestVisits'

const noop = (): void => {}

/**
 * Seção "Visitas" do trilho: cada acesso de visitante ativo é o ícone do
 * servidor que convidou, com um anel âmbar. Abre só a call do convite.
 */
function GuestVisitsRail(): React.JSX.Element | null {
  const location = useLocation()
  const navigate = useNavigate()
  const live = useLiveVisits()
  const memberOf = useServerStore(useShallow((s) => s.servers.map((srv) => srv.id)))
  // Virou membro: só o ícone normal do servidor, sem o da visita.
  const visits = visitsOutsideServers(live, memberOf)
  const voiceSrvId = useCallStore((s) => voiceServerId(s))
  if (visits.length === 0) return null

  return (
    <div role="group" aria-label={GUEST_COPY.railSection} className="flex flex-col items-center gap-2">
      <div className="h-0.5 w-8 rounded-full bg-fg/10" />
      <p aria-hidden="true" className="text-[10px] font-bold uppercase tracking-wide text-amber-300">
        {GUEST_COPY.railSection}
      </p>
      {visits.map((visit) => {
        const path = visitPath(visit.server_id)
        return (
          <div key={visit.server_id} className="rounded-[26px] ring-2 ring-amber-400/70">
            <ServerRailItem
              name={GUEST_COPY.railLabel(visit.server_name)}
              iconUrl={visit.server_icon_url}
              isActive={location.pathname === path}
              view={{ dimmed: false, badge: 0, voice: visit.server_id === voiceSrvId ? 'mine' : null }}
              onOpen={() => navigate(path)}
              onContextMenu={noop}
            />
          </div>
        )
      })}
    </div>
  )
}

export default GuestVisitsRail
