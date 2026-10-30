import { useActivityStore } from '../../../activity/store/activityStore'
import type { activityOfPlayer } from '../../../activity/lib/activityState'
import { ActivityGlyph } from '../../../call/components/ActivityPickerPopover'
import type { liveTarget } from '../../../call/lib/screenPreview'
import { requestWatchStream } from '../../../call/store/streamJoinStore'
import type { Channel } from '../../../servers/api/channels'
import type { ProfileCardTarget } from '../../store/profileCardStore'
import LiveStreamPreview from '../LiveStreamPreview'

interface LiveExtrasProps {
  target: ProfileCardTarget
  stream: ReturnType<typeof liveTarget>
  joinableActivity: ReturnType<typeof activityOfPlayer> | null
  name: string
  channels: Channel[]
  close: () => void
}

/** Transmitindo agora: a prévia da live; jogando na minha call: entrar na atividade. */
function LiveExtras({
  target,
  stream,
  joinableActivity,
  name,
  channels,
  close
}: LiveExtrasProps): React.JSX.Element {
  const joinActivity = useActivityStore((s) => s.join)
  const watchStream = (): void => {
    if (!stream) return
    close()
    requestWatchStream({
      userId: target.userId,
      name,
      target: stream,
      channelName:
        stream.kind === 'join' ? channels.find((c) => c.id === stream.channelId)?.name : undefined
    })
  }
  return (
    <>
      {stream && (
        <LiveStreamPreview
          key={`${stream.callId}:${target.userId}`}
          userId={target.userId}
          name={name}
          target={stream}
          onWatch={watchStream}
        />
      )}
      {joinableActivity && (
        <button
          type="button"
          onClick={() => {
            close()
            void joinActivity()
          }}
          className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-success-strong px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-success-strong-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <ActivityGlyph activity={joinableActivity} className="h-4 w-4" />
          Juntar-se à atividade
          <span className="sr-only">: {joinableActivity.name}</span>
        </button>
      )}
    </>
  )
}

export default LiveExtras
