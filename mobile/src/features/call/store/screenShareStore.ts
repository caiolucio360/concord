import { create } from 'zustand'

/** Transmissões de tela da chamada: quem está transmitindo, se eu estou e a que estou assistindo. */
interface ScreenShareState {
  /** Ids de quem está transmitindo a tela (eu inclusive). */
  sharers: string[]
  /** Eu estou transmitindo a minha tela. */
  sharing: boolean
  /** Quem estou assistindo (uma transmissão por vez); null = nenhuma. */
  watching: string | null
  setSharers: (sharers: string[]) => void
  setSharing: (sharing: boolean) => void
  setWatching: (userId: string | null) => void
  reset: () => void
}

export const useScreenShareStore = create<ScreenShareState>()((set) => ({
  sharers: [],
  sharing: false,
  watching: null,
  // A transmissão que eu assistia acabou: a tela de assistir fecha sozinha.
  setSharers: (sharers) => set((s) => ({ sharers, watching: s.watching && sharers.includes(s.watching) ? s.watching : null })),
  setSharing: (sharing) => set({ sharing }),
  setWatching: (watching) => set({ watching }),
  reset: () => set({ sharers: [], sharing: false, watching: null })
}))
