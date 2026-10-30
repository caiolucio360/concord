export interface SpreadRefreshOptions {
  /** Atraso máximo; cada cliente sorteia entre 0 e isto. */
  maxDelayMs: number
  random?: () => number
}

/**
 * Agenda uma releitura por servidor com atraso sorteado. Uma mudança de cargo
 * avisa todo mundo do servidor de uma vez: sem o sorteio, todos os clientes
 * pedem o servidor inteiro (membros, cargos, canais) no mesmo instante.
 * Invalidações seguidas do mesmo servidor, antes da releitura sair, viram uma
 * só (a releitura sai depois de todas, então já vê o estado novo).
 */
export function createSpreadRefresh({ maxDelayMs, random = Math.random }: SpreadRefreshOptions) {
  const pending = new Set<string>()
  return (key: string, run: () => void): void => {
    if (pending.has(key)) return
    pending.add(key)
    setTimeout(
      () => {
        pending.delete(key)
        run()
      },
      Math.floor(random() * maxDelayMs)
    )
  }
}
