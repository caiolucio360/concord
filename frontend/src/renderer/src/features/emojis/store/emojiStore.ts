import { create } from 'zustand'
import type { WsEvent } from '../../../shared/api/ws'
import { EMOTE_CATEGORIES, type EmoteCategory } from '../../chat/lib/emotes'
import { basePackToCategories } from '../lib/baseEmojis'
import {
  type CustomEmoji,
  type ServerEmojis,
  deleteServerEmoji,
  fetchBasePack,
  fetchMyEmojis,
  uploadServerEmoji
} from '../api/emojis'

// Emojis personalizados dos servidores da pessoa e o pack base. Uma carga por
// sessão; depois só eventos do ws (emoji:created/deleted) e recarga explícita
// quando a lista de servidores muda (ver watchServers).

interface EmojiState {
  groups: ServerEmojis[]
  byId: Record<string, CustomEmoji>
  loaded: boolean
  /** Categorias do pack base (null até carregar). */
  base: EmoteCategory[] | null
  ensureLoaded: () => Promise<void>
  reload: () => Promise<void>
  ensureBase: () => Promise<void>
  upload: (serverId: string, name: string, file: Blob) => Promise<CustomEmoji>
  remove: (serverId: string, emojiId: string) => Promise<void>
  handleWsEvent: (event: WsEvent) => boolean
}

let loading: Promise<void> | null = null
let loadingBase: Promise<void> | null = null

function indexById(groups: ServerEmojis[]): Record<string, CustomEmoji> {
  const byId: Record<string, CustomEmoji> = {}
  for (const g of groups) for (const e of g.emojis) byId[e.id] = e
  return byId
}

const withGroups = (groups: ServerEmojis[]): Pick<EmojiState, 'groups' | 'byId'> => ({
  groups,
  byId: indexById(groups)
})

/** Põe o emoji no grupo do servidor; null se a pessoa ainda não tem esse grupo. */
export function addEmoji(groups: ServerEmojis[], emoji: CustomEmoji): ServerEmojis[] | null {
  const i = groups.findIndex((g) => g.server_id === emoji.server_id)
  if (i < 0) return null
  if (groups[i].emojis.some((e) => e.id === emoji.id)) return groups
  const next = [...groups]
  next[i] = { ...groups[i], emojis: [...groups[i].emojis, emoji] }
  return next
}

export function removeEmoji(groups: ServerEmojis[], emojiId: string): ServerEmojis[] {
  return groups
    .map((g) => ({ ...g, emojis: g.emojis.filter((e) => e.id !== emojiId) }))
    .filter((g) => g.emojis.length > 0)
}

export const useEmojiStore = create<EmojiState>((set, get) => {
  const applyCreated = (emoji: CustomEmoji): void => {
    const next = addEmoji(get().groups, emoji)
    if (next) set(withGroups(next))
    else void get().reload()
  }

  return {
    groups: [],
    byId: {},
    loaded: false,
    base: null,

    ensureLoaded: () => {
      if (get().loaded) return Promise.resolve()
      return get().reload()
    },

    reload: () => {
      loading ??= fetchMyEmojis()
        .then((groups) => set({ ...withGroups(groups), loaded: true }))
        .catch(() => {})
        .finally(() => {
          loading = null
        })
      return loading
    },

    ensureBase: () => {
      if (get().base) return Promise.resolve()
      loadingBase ??= fetchBasePack()
        .then((pack) => set({ base: basePackToCategories(pack) }))
        .catch(() => set({ base: EMOTE_CATEGORIES }))
        .finally(() => {
          loadingBase = null
        })
      return loadingBase
    },

    upload: async (serverId, name, file) => {
      const created = await uploadServerEmoji(serverId, name, file)
      applyCreated(created)
      return created
    },

    remove: async (serverId, emojiId) => {
      await deleteServerEmoji(serverId, emojiId)
      set(withGroups(removeEmoji(get().groups, emojiId)))
    },

    handleWsEvent: (event) => {
      if (!get().loaded) return event.type.startsWith('emoji:')
      const payload = (event.payload ?? {}) as { emoji?: CustomEmoji; emoji_id?: string }
      if (event.type === 'emoji:created' && payload.emoji) applyCreated(payload.emoji)
      else if (event.type === 'emoji:deleted' && payload.emoji_id)
        set(withGroups(removeEmoji(get().groups, payload.emoji_id)))
      else return false
      return true
    }
  }
})

/** Volta ao estado inicial (logout e testes). */
export function resetEmojiStore(): void {
  loading = null
  loadingBase = null
  useEmojiStore.setState({ groups: [], byId: {}, loaded: false, base: null })
}
