import { Navigate, useParams } from 'react-router-dom'
import MobileBackFrame from '../../navigation/components/MobileBackFrame'
import { InviteSpinner } from '../../servers/components/InviteServerInfo'
import { useServerStore } from '../../servers/store/serverStore'
import { useVisit } from '../hooks/useGuestVisits'
import { visitPageTarget } from '../lib/guestVisits'
import { useGuestVisitsStore } from '../store/guestVisitsStore'
import GuestVisitView from '../components/GuestVisitView'

/**
 * /visitas/<servidor>: a visita de quem tem conta (link de visitante), dentro
 * do app. Quem é membro (ou acabou de virar) vai para o servidor; acabou ou
 * não existe: volta para o Início.
 */
function GuestVisitPage(): React.JSX.Element {
  const { serverId = '' } = useParams()
  const visit = useVisit(serverId)
  const loaded = useGuestVisitsStore((s) => s.loaded)
  const joinedChannel = useGuestVisitsStore((s) => s.joined[serverId])
  const member = useServerStore((s) => s.servers.some((srv) => srv.id === serverId))
  const target = visitPageTarget({ serverId, member, visit, loaded, joinedChannel })
  if (target.kind === 'go') return <Navigate to={target.path} replace />
  if (target.kind === 'visit' && visit) {
    return (
      <MobileBackFrame>
        <GuestVisitView visit={visit} />
      </MobileBackFrame>
    )
  }
  return (
    <div role="status" className="flex h-full items-center justify-center">
      <InviteSpinner />
    </div>
  )
}

export default GuestVisitPage
