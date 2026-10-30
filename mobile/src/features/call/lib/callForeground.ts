import type { CallPhase } from './callTypes'

/** O serviço em primeiro plano do Android (ADR 0030). Porta: só `notifeeForeground.ts` fala com o notifee. */
export interface ForegroundPort {
  start(info: { title: string }): Promise<void>
  stop(): Promise<void>
}

// Fases em que a chamada precisa continuar viva com o app em segundo plano (tocando para mim ainda não conta).
const KEEP_ALIVE: CallPhase[] = ['outgoing', 'connecting', 'active', 'reconnecting']

/**
 * Liga o serviço ao entrar na chamada e desliga ao sair. Sem ele o Android pausa o JavaScript e corta o
 * microfone em segundo plano, e a chamada cai uns 30 s depois de ir para outra tela.
 */
export function createCallForeground(port: ForegroundPort) {
  let running = false
  return {
    sync({ phase, name }: { phase: CallPhase; name: string }): void {
      const want = KEEP_ALIVE.includes(phase)
      if (want === running) return
      running = want
      const done = want ? port.start({ title: name }) : port.stop()
      done.catch((err: unknown) => console.warn('[call] serviço em primeiro plano:', err))
    }
  }
}
