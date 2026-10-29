import { create } from 'zustand'
import { useAuthStore } from '../../auth/store/authStore'
import { fetchBadges, type Badge } from '../api/badges'

/** Cartão aberto de novo depois disso busca os badges outra vez. */
const MAX_AGE_MS = 60_000

export interface BadgesModalTarget {
  userId: string
  name: string
  /** Badge selecionado ao abrir. */
  category?: string
}

interface BadgeState {
  byUser: Record<string, { badges: Badge[]; hiddenRemaining: number; loadedAt: number }>
  modal: BadgesModalTarget | null
  /** Busca se ainda não tem (ou se está velho). */
  ensureBadges: (userId: string, force?: boolean) => Promise<void>
  openModal: (target: BadgesModalTarget) => void
  closeModal: () => void
  reset: () => void
}

const inflight = new Map<string, Promise<void>>()

export const useBadgeStore = create<BadgeState>()((set, get) => ({
  byUser: {},
  modal: null,

  ensureBadges: (userId, force = false) => {
    if (!userId) return Promise.resolve()
    const cached = get().byUser[userId]
    if (!force && cached && Date.now() - cached.loadedAt < MAX_AGE_MS) return Promise.resolve()
    const running = inflight.get(userId)
    if (running && !force) return running
    const token = useAuthStore.getState().accessToken
    const job = fetchBadges(userId)
      .then((res) => {
        if (useAuthStore.getState().accessToken !== token) return
        set((s) => ({ byUser: { ...s.byUser, [userId]: { badges: res.badges, hiddenRemaining: res.hidden_remaining ?? 0, loadedAt: Date.now() } } }))
      })
      .catch(() => {})
      .finally(() => {
        if (inflight.get(userId) === job) inflight.delete(userId)
      })
    inflight.set(userId, job)
    return job
  },

  openModal: (target) => set({ modal: target }),
  closeModal: () => set({ modal: null }),
  reset: () => {
    inflight.clear()
    set({ byUser: {}, modal: null })
  }
}))
