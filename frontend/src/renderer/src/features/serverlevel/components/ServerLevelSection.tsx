import { useServerStore } from '../../servers/store/serverStore'
import ServerLevelDetails from './ServerLevelDetails'

/** Aba "Nível" das configurações do servidor. */
function ServerLevelSection(): React.JSX.Element {
  const server = useServerStore((s) => s.currentServer)
  if (!server) return <p className="text-ds-sm text-muted">Abra um servidor primeiro.</p>
  return (
    <div className="max-w-xl">
      <ServerLevelDetails serverId={server.id} />
    </div>
  )
}

export default ServerLevelSection
