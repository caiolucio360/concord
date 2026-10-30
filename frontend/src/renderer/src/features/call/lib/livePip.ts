// Janela flutuante (Picture-in-Picture) da live de alguém: assistir com o app
// atrás do jogo. O vídeo do PiP é um <video> próprio, fora do React, para que
// trocar de canal ou sair da tela da chamada não feche a janela. Ela fecha
// sozinha quando a live some (parou, deixei de assistir, saí da chamada) e segue
// o stream novo se a live reconectar. Enquanto aberta, a live não pausa por
// fora de vista nem com o app minimizado (screenVideoPause). O som não passa por
// aqui: segue no RemoteAudio, como sempre.
//
// Document Picture-in-Picture (janela com controles próprios) ficou de fora:
// exige copiar estilos e montar React em outra janela, e não existe no Firefox
// nem no Safari; o PiP de vídeo já tem fechar e voltar ao app nativos.

/** O pedaço do HTMLVideoElement que o PiP usa (fácil de simular no teste). */
export interface PipVideo {
  srcObject: MediaProvider | null
  play(): Promise<void>
  requestPictureInPicture(): Promise<unknown>
  addEventListener(type: 'leavepictureinpicture', listener: () => void): void
  remove(): void
}

export interface LivePipDeps {
  createVideo: () => PipVideo
  /** document.exitPictureInPicture */
  exit: () => Promise<void>
  /** Stream da live que estou assistindo (null = não estou). */
  streamOf: (userId: string) => MediaStream | null
  /** Avisa quando os streams das lives mudam; devolve o unsubscribe. */
  watchStreams: (onChange: () => void) => () => void
  setActive: (userId: string | null) => void
}

export interface LivePip {
  open: (userId: string) => Promise<boolean>
  close: () => Promise<void>
  toggle: (userId: string) => Promise<boolean>
  current: () => string | null
}

interface Open {
  userId: string
  video: PipVideo
  stop: () => void
}

export function createLivePip(deps: LivePipDeps): LivePip {
  let open: Open | null = null
  let opening: Promise<boolean> | null = null

  const cleanup = (): void => {
    if (!open) return
    const { video, stop } = open
    open = null
    stop()
    video.srcObject = null
    video.remove()
    deps.setActive(null)
  }

  const close = async (): Promise<void> => {
    if (!open) return
    await deps.exit().catch(() => {})
    cleanup()
  }

  const show = (video: PipVideo, stream: MediaStream): void => {
    if (video.srcObject === stream) return
    video.srcObject = stream
    void video.play().catch(() => {})
  }

  const follow = (): void => {
    if (!open) return
    const stream = deps.streamOf(open.userId)
    if (stream) show(open.video, stream)
    else void close()
  }

  const start = async (userId: string, stream: MediaStream): Promise<boolean> => {
    const video = deps.createVideo()
    video.srcObject = stream
    try {
      await video.play()
      await video.requestPictureInPicture()
    } catch {
      video.srcObject = null
      video.remove()
      return false
    }
    open = { userId, video, stop: deps.watchStreams(follow) }
    video.addEventListener('leavepictureinpicture', cleanup)
    deps.setActive(userId)
    return true
  }

  const openLive = async (userId: string): Promise<boolean> => {
    if (opening) return opening
    const stream = deps.streamOf(userId)
    if (!stream) return false
    if (open) {
      // Já tem janela: troca a live nela mesma.
      open.userId = userId
      show(open.video, stream)
      deps.setActive(userId)
      return true
    }
    opening = start(userId, stream).finally(() => {
      opening = null
    })
    return opening
  }

  return {
    open: openLive,
    close,
    toggle: async (userId) => {
      if (open?.userId !== userId) return openLive(userId)
      await close()
      return false
    },
    current: () => open?.userId ?? null
  }
}

/** O navegador deixa abrir PiP de vídeo (Electron e Chrome sim; Firefox não). */
export function pipSupported(doc: { pictureInPictureEnabled?: boolean }): boolean {
  return doc.pictureInPictureEnabled === true
}

/** Nome do botão: o que o clique faz. */
export function pipButtonLabel(active: boolean): string {
  return active ? 'Sair da janela flutuante' : 'Janela flutuante'
}
