import { create } from 'zustand'
import type { WsEvent } from '../../../shared/api/ws'
import {
  getMusicPresence,
  getMusicState,
  type MusicPresenceEvent,
  type MusicReplyEvent,
  type MusicSearchEvent,
  type MusicState
} from '../api/music'

/** Resposta do Maestro que só eu vejo (texto ou lista de resultados de busca); não fica salva. */
export interface MusicEphemeral {
  id: string
  room: string
  kind: 'text' | 'search'
  text?: string
  search?: MusicSearchEvent
  expired?: boolean
}

let nextId = 0

interface MusicStore {
  /** Estado do Maestro na call em que estou. */
  state: MusicState | null
  /** relógio do servidor − relógio local (ms). */
  serverOffsetMs: number
  /** serverId → canais de voz com o Maestro tocando. */
  presence: Record<string, string[]>
  ephemeral: MusicEphemeral[]
  /** Painel "Tocando agora" aberto. */
  panelOpen: boolean
  handleWsEvent: (event: WsEvent) => void
  loadState: (serverId: string) => Promise<void>
  loadPresence: (serverId: string) => Promise<void>
  dismiss: (id: string) => void
  markExpired: (id: string) => void
  openPanel: () => void
  closePanel: () => void
  clearState: () => void
}

function applyPresence(presence: Record<string, string[]>, p: MusicPresenceEvent): Record<string, string[]> {
  const current = new Set(presence[p.server_id] ?? [])
  if (p.active) current.add(p.channel_id)
  else current.delete(p.channel_id)
  return { ...presence, [p.server_id]: [...current].sort() }
}

const addEphemeral = (list: MusicEphemeral[], item: Omit<MusicEphemeral, 'id'>): MusicEphemeral[] => [...list, { id: `m${nextId++}`, ...item }]

export const useMusicStore = create<MusicStore>((set, get) => ({
  state: null,
  serverOffsetMs: 0,
  presence: {},
  ephemeral: [],
  panelOpen: false,

  handleWsEvent: (event) => {
    switch (event.type) {
      case 'music:state': {
        const s = event.payload as MusicState
        if (s.closed) {
          if (get().state?.call_id === s.call_id) set({ state: null, panelOpen: false })
          return
        }
        set({ state: s, serverOffsetMs: s.server_time - Date.now() })
        return
      }
      case 'music:reply': {
        const r = event.payload as MusicReplyEvent
        set((st) => ({ ephemeral: addEphemeral(st.ephemeral, { room: `channel:${r.channel_id}`, kind: 'text', text: r.text }) }))
        return
      }
      case 'music:search': {
        const s = event.payload as MusicSearchEvent
        set((st) => ({ ephemeral: addEphemeral(st.ephemeral, { room: `channel:${s.channel_id}`, kind: 'search', search: s }) }))
        return
      }
      case 'music:presence':
        set((st) => ({ presence: applyPresence(st.presence, event.payload as MusicPresenceEvent) }))
        return
    }
  },

  loadState: async (serverId) => {
    const s = await getMusicState(serverId)
    set(s ? { state: s, serverOffsetMs: s.server_time - Date.now() } : { state: null })
  },

  loadPresence: async (serverId) => {
    const ids = await getMusicPresence(serverId)
    set((st) => ({ presence: { ...st.presence, [serverId]: ids } }))
  },

  dismiss: (id) => set((st) => ({ ephemeral: st.ephemeral.filter((e) => e.id !== id) })),
  markExpired: (id) => set((st) => ({ ephemeral: st.ephemeral.map((e) => (e.id === id ? { ...e, expired: true } : e)) })),
  openPanel: () => set({ panelOpen: true }),
  closePanel: () => set({ panelOpen: false }),
  clearState: () => set({ state: null, panelOpen: false })
}))
