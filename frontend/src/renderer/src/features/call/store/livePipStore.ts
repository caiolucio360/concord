import { create } from 'zustand'

// De quem é a live que está na janela flutuante (Picture-in-Picture) agora.
// Quem abre e fecha é lib/livePip.ts; screenVideoPause não pausa essa live.

interface LivePipState {
  /** userId de quem transmite; null = nenhuma janela flutuante aberta. */
  userId: string | null
  setUserId: (userId: string | null) => void
}

export const useLivePipStore = create<LivePipState>((set, get) => ({
  userId: null,
  setUserId: (userId) => {
    if (get().userId !== userId) set({ userId })
  }
}))
