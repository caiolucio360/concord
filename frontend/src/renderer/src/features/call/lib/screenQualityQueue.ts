import type { ScreenShareQuality } from './screenShareQuality'

// Trocas de qualidade da minha live, uma de cada vez. Enquanto uma está em
// andamento, cliques novos substituem a fila: só a escolha final chega ao
// servidor. Extraído do callStore.

export interface ScreenQualityConnection {
  updateScreenQuality(stream: MediaStream, quality: ScreenShareQuality): Promise<void>
}

export interface ScreenQualityRequest<C extends ScreenQualityConnection> {
  stream: MediaStream
  connection: C
  callId: string | null
  quality: ScreenShareQuality
}

export interface ScreenQualityQueueDeps<C extends ScreenQualityConnection> {
  /** A troca ainda vale: mesma transmissão, mesma conexão e mesma chamada. */
  isCurrent(request: ScreenQualityRequest<C>): boolean
  applied(request: ScreenQualityRequest<C>): void
  failed(): void
  /** A fila esvaziou. */
  idle(): void
}

export const sameScreenQuality = (
  a: ScreenShareQuality | null,
  b: ScreenShareQuality
): boolean => a?.resolution === b.resolution && a?.frameRate === b.frameRate

export class ScreenQualityQueue<C extends ScreenQualityConnection> {
  private pending: ScreenQualityRequest<C> | null = null
  private running = false

  constructor(private readonly deps: ScreenQualityQueueDeps<C>) {}

  push(request: ScreenQualityRequest<C>): void {
    this.pending = request
    if (!this.running) void this.run()
  }

  clear(): void {
    this.pending = null
  }

  private async run(): Promise<void> {
    this.running = true
    try {
      while (this.pending) {
        const request = this.pending
        this.pending = null
        if (this.deps.isCurrent(request)) await this.apply(request)
      }
    } finally {
      this.running = false
      this.deps.idle()
    }
  }

  private async apply(request: ScreenQualityRequest<C>): Promise<void> {
    try {
      await request.connection.updateScreenQuality(request.stream, request.quality)
      if (this.deps.isCurrent(request)) this.deps.applied(request)
    } catch {
      if (this.deps.isCurrent(request)) this.deps.failed()
    }
  }
}
