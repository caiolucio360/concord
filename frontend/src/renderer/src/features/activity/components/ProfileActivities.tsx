import { useId, useState } from 'react'
import { musicAccent } from '../../../../../shared/musicApps'
import type { ListeningActivity } from '../lib/listeningActivity'
import type { PresenceActivity } from '../lib/presenceActivity'
import { useActivity } from '../store/presenceActivityStore'
import { useListening } from '../store/listeningStore'
import { Elapsed } from './ActivityCard'
import GameIcon from './GameIcon'
import MusicIcon from './MusicIcon'
import TrackProgress from './TrackProgress'
import SectionHeader from '../../../shared/ui/SectionHeader'
import { ChevronDownIcon } from '../../../shared/ui/icons'
import { ListeningActions } from './ListeningActions'

function PlayingNow({ game }: { game: PresenceActivity }): React.JSX.Element {
  return (
    <div className="mt-3 rounded-lg bg-fg/5 p-2.5">
      <SectionHeader as="p">Jogando agora</SectionHeader>
      <p className="mt-1 flex items-center gap-1.5 text-ds-md font-semibold text-strong">
        <GameIcon
          name={game.name}
          appId={game.app_id}
          iconHash={game.icon_hash}
          className="h-4 w-4 shrink-0"
        />
        <span className="truncate">{game.name}</span>
        <span className="shrink-0 text-ds-xs font-normal text-muted">
          <Elapsed startedAt={game.started_at} />
        </span>
      </p>
    </div>
  )
}

/** "Ouvindo Spotify": música, artista, álbum e o tempo andando. Clicar abre "Ouvir também". */
export function ListeningNow({ listening }: { listening: ListeningActivity }): React.JSX.Element {
  const accent = musicAccent(listening.app) ?? '#5865f2'
  const [open, setOpen] = useState(false)
  const menuId = useId()
  return (
    <div className="mt-3 rounded-lg bg-fg/5 p-2.5">
      <SectionHeader as="p" className="truncate">
        Ouvindo {listening.app}
      </SectionHeader>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        className="focus-ring -mx-1 mt-1 flex w-[calc(100%+0.5rem)] min-w-0 cursor-pointer items-center gap-2.5 rounded-md p-1 text-left transition-colors hover:bg-fg/5"
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
          style={{ background: `${accent}33` }}
        >
          <MusicIcon app={listening.app} className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span
            className="block truncate text-ds-md font-semibold text-strong"
            title={listening.title}
          >
            {listening.title}
          </span>
          {listening.artist && (
            <span className="block truncate text-ds-sm text-secondary" title={listening.artist}>
              {listening.artist}
            </span>
          )}
          {listening.album && (
            <span className="block truncate text-ds-xs text-muted" title={listening.album}>
              {listening.album}
            </span>
          )}
        </span>
        <ChevronDownIcon
          size={16}
          className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <TrackProgress startedAt={listening.started_at} durationMs={listening.duration_ms} />
      {open && <ListeningActions listening={listening} id={menuId} />}
    </div>
  )
}

/** "Jogando agora" e "Ouvindo" no cartão de perfil; nada se não houver nenhum. */
export function ProfileActivities({ userId }: { userId: string | undefined }): React.JSX.Element {
  const game = useActivity(userId)
  const listening = useListening(userId)
  return (
    <>
      {game && <PlayingNow game={game} />}
      {listening && <ListeningNow listening={listening} />}
    </>
  )
}
