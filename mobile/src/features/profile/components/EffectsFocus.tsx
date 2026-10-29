import { useIsFocused } from 'expo-router'
import { createContext, useContext, type ReactNode } from 'react'

// A tela do cartão avisa se está em foco; o efeito para quando outra tela abre por cima. O padrão é "em
// foco" porque o cartão também aparece fora de uma rota (testes, telas soltas), onde useIsFocused lança erro.
const FocusContext = createContext(true)

/** Fica nas rotas que mostram o cartão (perfil/[id] e a aba Você). */
export function EffectsFocusProvider({ children }: { children: ReactNode }) {
  return <FocusContext.Provider value={useIsFocused()}>{children}</FocusContext.Provider>
}

export const useEffectsFocused = (): boolean => useContext(FocusContext)
