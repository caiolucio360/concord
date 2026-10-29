import { useEffect, useState } from 'react'
import { AccessibilityInfo, AppState } from 'react-native'

/** O app está em primeiro plano? O efeito não gasta bateria com o app em segundo plano. */
export function useAppActive(): boolean {
  const [active, setActive] = useState(AppState.currentState === 'active')
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setActive(state === 'active'))
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
