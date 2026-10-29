import { create } from 'zustand'
import { useAuthStore } from '../../auth/store/authStore'
import { fetchLevels, fetchMyLevel, type LevelProgress } from '../api/levels'

interface LevelState {
  /** Nível de cada usuário já carregado. */
  levels: Record<string, number>
  /** Progresso detalhado de quem está logado (barra de XP). */
  me: LevelProgress | null
  /** Pede o nível de quem ainda não tem; vários pedidos juntos viram um request só. */
  ensureLevels: (userIds: string[]) => void
  loadMe: () => Promise<void>
  reset: () => void
}

// Pedidos de nível juntados em um só request (vários selos montam juntos).
const requested = new Set<string>()
const pending = new Set<string>()
let timer: ReturnType<typeof setTimeout> | null = null
const BATCH_MS = 30

export const useLevelStore = create<LevelState>()((set, get) => ({
  levels: {},
  me: null,

  ensureLevels: (userIds) => {
    for (const id of userIds) {
      if (!id || id in get().levels || requested.has(id)) continue
      requested.add(id)
      pending.add(id)
    }
    if (pending.size === 0 || timer) return
    timer = setTimeout(() => {
      timer = null
      const ids = [...pending]
      pending.clear()
      const token = useAuthStore.getState().accessToken
      fetchLevels(ids)
        .then((map) => {
          if (useAuthStore.getState().accessToken !== token) return
          set((s) => ({ levels: { ...s.levels, ...Object.fromEntries(Object.entries(map).map(([id, p]) => [id, p.level])) } }))
        })
        .catch(() => ids.forEach((id) => requested.delete(id)))
    }, BATCH_MS)
  },

  loadMe: async () => {
    const me = await fetchMyLevel()
    set((s) => ({ me, levels: { ...s.levels, [me.user_id]: me.level } }))
  },

  reset: () => {
    requested.clear()
    pending.clear()
    if (timer) clearTimeout(timer)
    timer = null
    set({ levels: {}, me: null })
  }
}))
