import LiveBadge from './LiveBadge'
import { Skeleton } from '../../../shared/ui/skeleton/Skeleton'

/** A foto da transmissão em 16:9 com o selo LIVE: carregando, foto ou encerrada. */
export default function LivePreviewFrame({
  src,
  ended,
  name
}: {
  src: string | null
  ended: boolean
  name: string
}): React.JSX.Element {
  return (
    <div className="relative aspect-video w-full bg-black">
      {src ? (
        <img
          src={src}
          alt={`Prévia da transmissão de ${name}`}
          draggable={false}
          className="h-full w-full object-contain"
        />
      ) : ended ? (
        <div className="flex h-full items-center justify-center text-ds-xs text-faint">
          Transmissão encerrada
        </div>
      ) : (
        <div role="status" aria-label="Carregando prévia…" className="h-full w-full">
          <Skeleton className="h-full w-full rounded-none" />
        </div>
      )}
      <span className="absolute left-2 top-2">
        <LiveBadge />
      </span>
    </div>
  )
}
