// O Android derruba o WebSocket quando o app vai para o segundo plano ou a rede some: ao voltar (AppState
// "active" ou rede de volta) reconecta na hora, sem esperar o backoff. E o contrário: em segundo plano a
// conexão é fechada de propósito depois de uma tolerância, porque o servidor só manda push (mensagem, menção,
// chamada) para quem NÃO está online, e um socket esquecido aberto faz o app parecer online. As fontes entram
// por parâmetro para testar sem o RN.

/** Quanto tempo em segundo plano antes de fechar a conexão (troca rápida de app não derruba nada). */
export const BACKGROUND_GRACE_MS = 15_000

interface Retryable {
  retryNow(): void
  suspend(): void
  resume(): void
}

interface AppStateSource {
  addEventListener(type: 'change', handler: (state: string) => void): { remove(): void }
}

interface NetInfoSource {
  addEventListener(handler: (state: { isConnected: boolean | null }) => void): () => void
}

interface KeepAlive {
  /** Verdadeiro enquanto o app precisa da conexão mesmo em segundo plano (chamada em andamento). */
  keepAlive: () => boolean
  /** Avisa quando o motivo de manter a conexão muda. Devolve o "desligar". */
  onKeepAliveChange: (listener: () => void) => () => void
}

const NEVER: KeepAlive = { keepAlive: () => false, onKeepAliveChange: () => () => {} }

/** Liga a conexão ao ciclo de vida do app. Devolve o "desligar". */
export function bindRealtimeLifecycle(
  client: Retryable,
  appState: AppStateSource,
  netInfo: NetInfoSource,
  { keepAlive, onKeepAliveChange }: KeepAlive = NEVER
): () => void {
  let background = false
  let timer: ReturnType<typeof setTimeout> | null = null
  const cancel = (): void => {
    if (timer) clearTimeout(timer)
    timer = null
  }
  /** Em segundo plano e sem motivo para ficar online: fecha depois da tolerância. */
  const evaluate = (): void => {
    cancel()
    if (!background || keepAlive()) return
    timer = setTimeout(() => {
      timer = null
      if (background && !keepAlive()) client.suspend()
    }, BACKGROUND_GRACE_MS)
  }
  const app = appState.addEventListener('change', (state) => {
    if (state === 'active') {
      background = false
      cancel()
      client.resume()
    } else if (state === 'background') {
      background = true
      evaluate()
    }
  })
  const net = netInfo.addEventListener((state) => {
    if (state.isConnected === true) client.retryNow()
  })
  const offKeepAlive = onKeepAliveChange(evaluate)
  return () => {
    cancel()
    app.remove()
    net()
    offKeepAlive()
  }
}
