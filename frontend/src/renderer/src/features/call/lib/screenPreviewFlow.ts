import { ApiError } from '../../../shared/api/client'
import { PREVIEW_CAPTURE_EVERY_MS, PREVIEW_RETRY_MS, previewPollDelay } from './screenPreview'

// Partes com tempo da prévia da transmissão: quem transmite responde aos
// pedidos de foto sem tirar várias de uma vez, quem olha busca a foto enquanto
// o cartão está aberto, e quem entra na chamada espera a tela aparecer no
// LiveKit para começar a assistir. Sem store nem DOM.

/**
 * Responde a call:screen_preview_request: tira e manda uma foto, uma por vez
 * e no máximo uma a cada PREVIEW_CAPTURE_EVERY_MS. true = mandou.
 */
export function createPreviewSender<S>(deps: {
  capture: (stream: S) => Promise<string | null>
  upload: (callId: string, base64: string) => Promise<void>
  now?: () => number
}): (callId: string, stream: S) => Promise<boolean> {
  const now = deps.now ?? Date.now
  let busy = false
  let lastAt = -Infinity
  return async (callId, stream) => {
    if (busy || now() - lastAt < PREVIEW_CAPTURE_EVERY_MS) return false
    busy = true
    lastAt = now()
    try {
      const image = await deps.capture(stream)
      if (!image) return false
      await deps.upload(callId, image)
      return true
    } catch {
      // A prévia é um extra: falhar não atrapalha a transmissão.
      return false
    } finally {
      busy = false
    }
  }
}

/** Parou de transmitir ou não posso mais ver: não adianta insistir. */
function previewGone(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 404 || err.status === 403)
}

/**
 * Busca a foto da transmissão enquanto o cartão está aberto: já, rápido até a
 * primeira chegar, depois no ritmo normal. Devolve o stop (cartão fechou).
 */
export function pollScreenPreview(deps: {
  fetch: () => Promise<{ image: string | null }>
  onImage: (base64: string) => void
  onEnded: () => void
}): () => void {
  let cancelled = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let hasImage = false
  let fastRetries = 0
  const tick = async (): Promise<void> => {
    try {
      const { image } = await deps.fetch()
      if (cancelled) return
      if (image) {
        hasImage = true
        deps.onImage(image)
      }
    } catch (err) {
      if (cancelled) return
      if (previewGone(err)) return deps.onEnded()
    }
    const delay = previewPollDelay(hasImage, fastRetries)
    if (delay === PREVIEW_RETRY_MS) fastRetries++
    timer = setTimeout(() => void tick(), delay)
  }
  void tick()
  return () => {
    cancelled = true
    clearTimeout(timer)
  }
}

interface Watchable<T> {
  getState: () => T
  subscribe: (listener: (state: T) => void) => () => void
}

/**
 * Espera o estado ficar pronto. ready: true = pronto, false = continua
 * esperando, null = desiste (ex.: saiu da chamada). Resolve true só se ficou
 * pronto antes do prazo.
 */
export function waitUntil<T>(
  store: Watchable<T>,
  ready: (state: T) => boolean | null,
  timeoutMs: number
): Promise<boolean> {
  const first = ready(store.getState())
  if (first !== false) return Promise.resolve(first === true)
  return new Promise((resolve) => {
    let done = false
    const finish = (value: boolean): void => {
      if (done) return
      done = true
      clearTimeout(timer)
      unsubscribe()
      resolve(value)
    }
    const timer = setTimeout(() => finish(false), timeoutMs)
    const unsubscribe = store.subscribe((state) => {
      const r = ready(state)
      if (r !== false) finish(r === true)
    })
  })
}
