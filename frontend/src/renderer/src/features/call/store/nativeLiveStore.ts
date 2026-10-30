import { create } from 'zustand'
import type { NativeLiveAvailability } from '../../../../../shared/nativeLive'
import { loadNativeLivePref, saveNativeLivePref } from '../lib/nativeLiveChoice'

// Motor nativo da live (helper concord-live, docs/adr/0031): se existe nesta
// máquina e o que a pessoa escolheu (null = automático). Lido pelo modal da
// live e por quem decide o caminho ao transmitir.

interface NativeLiveState {
  availability: NativeLiveAvailability | null
  pref: boolean | null
  /** Pergunta ao main uma vez por sessão do app. */
  load: () => Promise<NativeLiveAvailability | null>
  setPref: (on: boolean) => void
}

let loading: Promise<NativeLiveAvailability | null> | null = null

export const useNativeLiveStore = create<NativeLiveState>((set) => ({
  availability: null,
  pref: loadNativeLivePref(),
  load: () => {
    loading ??= (window.api?.nativeLive?.availability() ?? Promise.resolve(null))
      .catch(() => null)
      .then((availability) => {
        set({ availability })
        return availability
      })
    return loading
  },
  setPref: (on) => {
    saveNativeLivePref(on)
    set({ pref: on })
  }
}))
