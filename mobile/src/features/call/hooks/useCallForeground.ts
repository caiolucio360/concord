import { useEffect } from 'react'
import { createCallForeground, type ForegroundPort } from '../lib/callForeground'
import { notifeeForeground } from '../lib/notifeeForeground'
import { useCallSessionStore } from '../store/callSessionStore'

/** Mantém o serviço em primeiro plano ligado enquanto há chamada: ir para outra tela não derruba mais. */
export function useCallForeground(port: ForegroundPort = notifeeForeground): void {
  useEffect(() => {
    const fg = createCallForeground(port)
    const sync = (): void => {
      const { phase, name } = useCallSessionStore.getState()
      fg.sync({ phase, name })
    }
    sync()
    return useCallSessionStore.subscribe(sync)
  }, [port])
}
