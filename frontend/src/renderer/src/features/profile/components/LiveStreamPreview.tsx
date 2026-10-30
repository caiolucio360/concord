import { type LiveTarget } from '../../call/lib/screenPreview'
import { useScreenPreview } from '../../call/hooks/useScreenPreview'
import LivePreviewFrame from '../../call/components/LivePreviewFrame'
import Button from '../../../shared/ui/Button'

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
        <Button type="button" variant="success" size="sm" onClick={onWatch} disabled={ended} className="w-full">
          Entrar na transmissão
        </Button>
      </div>
    </div>
  )
}

export default LiveStreamPreview
