// O Android derruba o WebSocket quando o app vai para o segundo plano ou a rede some: ao voltar (AppState
// "active" ou rede de volta) reconecta na hora, sem esperar o backoff. E o contrário: em segundo plano a
// conexão é fechada de propósito, porque o servidor só manda push (mensagem, menção, chamada) para quem NÃO
// está online, e um socket esquecido aberto faz o app parecer online. Fecha na hora, sem tolerância: o React
// Native pausa os timers (setTimeout) com o app em segundo plano, então esperar com um timer nunca dispara.
// As fontes entram por parâmetro para testar sem o RN.

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
  /** Em segundo plano e sem motivo para ficar online (chamada): fecha a conexão. */
  const evaluate = (): void => {
    if (background && !keepAlive()) client.suspend()
  }
  const app = appState.addEventListener('change', (state) => {
    if (state === 'active') {
      background = false
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
    app.remove()
    net()
    offKeepAlive()
  }
}
