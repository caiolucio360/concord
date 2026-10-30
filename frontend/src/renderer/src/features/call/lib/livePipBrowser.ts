import { useCallStore } from '../store/callStore'
import { useLivePipStore } from '../store/livePipStore'
import { createLivePip, pipSupported, type LivePip, type PipVideo } from './livePip'

// Liga o controlador da janela flutuante (livePip.ts) ao DOM e aos stores.

/** <video> mudo e invisível no body: fora do React, sobrevive à navegação. */
function createHiddenVideo(): PipVideo {
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.setAttribute('aria-hidden', 'true')
  video.dataset.livePip = ''
  Object.assign(video.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: '1px',
    height: '1px',
    opacity: '0',
    pointerEvents: 'none'
  })
  document.body.appendChild(video)
  return video
}

let instance: LivePip | null = null

function livePip(): LivePip {
  instance ??= createLivePip({
    createVideo: createHiddenVideo,
    exit: () => document.exitPictureInPicture(),
    streamOf: (userId) => useCallStore.getState().screenStreams[userId] ?? null,
    watchStreams: (onChange) =>
      useCallStore.subscribe((s, prev) => {
        if (s.screenStreams !== prev.screenStreams) onChange()
      }),
    setActive: (userId) => useLivePipStore.getState().setUserId(userId)
  })
  return instance
}

/** Abre a live de `userId` na janela flutuante ou, se já está nela, volta ao normal. */
export function toggleLivePip(userId: string): Promise<boolean> {
  return livePip().toggle(userId)
}

export function livePipSupported(): boolean {
  return typeof document !== 'undefined' && pipSupported(document)
}
