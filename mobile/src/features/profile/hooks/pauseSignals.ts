import { useEffect, useState } from 'react'
import { AccessibilityInfo, AppState } from 'react-native'

/** Só background e inactive pausam: o estado inicial pode vir indefinido no Android antes do primeiro evento. */
const inForeground = (state: string | null | undefined): boolean => state !== 'background' && state !== 'inactive'

/** O app está em primeiro plano? O efeito não gasta bateria com o app em segundo plano. */
export function useAppActive(): boolean {
  const [active, setActive] = useState(inForeground(AppState.currentState))
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setActive(inForeground(state)))
    return () => subscription.remove()
  }, [])
  return active
}

/** O sistema pede menos movimento ("Remover animações")? Sem resposta do sistema, movimento normal. */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    let live = true
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => live && setReduce(value))
      .catch(() => {})
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce)
    return () => {
      live = false
      subscription.remove()
    }
  }, [])
  return reduce
}
