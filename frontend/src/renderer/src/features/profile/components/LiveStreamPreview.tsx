import { type LiveTarget } from '../../call/lib/screenPreview'
import { useScreenPreview } from '../../call/hooks/useScreenPreview'
import LivePreviewFrame from '../../call/components/LivePreviewFrame'

interface LiveStreamPreviewProps {
  userId: string
  name: string
  target: LiveTarget
  onWatch: () => void
}

/** Prévia ao vivo da transmissão no cartão de perfil, com "Entrar na transmissão". */
function LiveStreamPreview({
  userId,
  name,
  target,
  onWatch
}: LiveStreamPreviewProps): React.JSX.Element {
  const { src, ended } = useScreenPreview(target.callId, userId)

  return (
    <div className="mt-3 overflow-hidden rounded-lg bg-black/30">
      <LivePreviewFrame src={src} ended={ended} name={name} />
      <div className="p-2">
        <button
          type="button"
          onClick={onWatch}
          disabled={ended}
          className="w-full cursor-pointer rounded-md bg-success-strong px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-success-strong-hover disabled:cursor-default disabled:opacity-60"
        >
          Entrar na transmissão
        </button>
      </div>
    </div>
  )
}

export default LiveStreamPreview
