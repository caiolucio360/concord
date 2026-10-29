export type MediaConnection = 'connected' | 'reconnecting' | 'disconnected'

/**
 * A mídia da chamada (LiveKit). Porta: só `livekitMedia.ts` fala com o SDK; o resto do app e os testes usam esta
 * interface (ADR 0023).
 */
export interface CallMedia {
  connect(url: string, token: string): Promise<void>
  disconnect(): Promise<void>
  /** Liga ou desliga o microfone; rejeita se o sistema negou a permissão. */
  setMicEnabled(on: boolean): Promise<void>
  /** Liga ou desliga o áudio que chega (fone). */
  setListening(on: boolean): void
  /** Liga ou desliga a transmissão da minha tela (o sistema pede a permissão de captura); rejeita se ela for negada. */
  setScreenShareEnabled(on: boolean): Promise<void>
  /** Quem está transmitindo a tela agora (ids das pessoas, eu inclusive). */
  onScreens(listener: (userIds: string[]) => void): () => void
  /** Começa ou para de receber a transmissão de alguém (só o que se assiste consome rede). */
  watchScreen(userId: string, on: boolean): void
  onSpeakers(listener: (userIds: string[]) => void): () => void
  onConnection(listener: (state: MediaConnection) => void): () => void
}
