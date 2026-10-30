import type { StoreApi } from 'zustand'
import { getServer } from '../api/servers'
import { listChannels as apiListChannels } from '../api/channels'
import { useAuthStore } from '../../auth/store/authStore'
import { sortRoles } from '../lib/roleList'
import { nicknameMap } from '../lib/serverNames'
import type { ServerState } from './serverStore'

// Carregar a tela de um servidor (o servidor, membros, cargos e canais),
// separado do serverStore, que só junta as ações.

/** Conta as chamadas de selectServer: só a mais recente grava o resultado. */
let selectSeq = 0
/** Idem para a busca de canais (a resposta velha chega depois da nova). */
let channelsSeq = 0

export const isSameSession = (tokenAtStart: string | null): boolean =>
  useAuthStore.getState().accessToken === tokenAtStart

type Set = StoreApi<ServerState>['setState']
type Get = StoreApi<ServerState>['getState']

export function serverViewActions(
  set: Set,
  get: Get
): Pick<ServerState, 'selectServer' | 'refreshServer' | 'fetchChannels'> {
  return {
    selectServer: async (id: string) => {
      const token = useAuthStore.getState().accessToken
      const seq = ++selectSeq
      // Já é o servidor na tela: busca por baixo e troca quando chegar. O
      // "carregando" (que tira a tela toda, modal junto) é só para abrir outro.
      const refreshing = get().currentServer?.id === id
      if (!refreshing) set({ loading: true })
      try {
        const res = await getServer(id)
        if (!isSameSession(token) || seq !== selectSeq) return
        set({
          currentServer: res.server,
          currentMembers: res.members,
          roles: sortRoles(res.roles ?? []),
          nicknames: { ...get().nicknames, [id]: nicknameMap(res.members) }
        })
      } catch (err) {
        if (!isSameSession(token) || seq !== selectSeq) return
        if (!refreshing) set({ currentServer: null, currentMembers: [], roles: [] })
        throw err
      } finally {
        if (seq === selectSeq) set({ loading: false })
      }
    },
    refreshServer: async (serverId: string) => {
      const token = useAuthStore.getState().accessToken
      try {
        const [res, channels] = await Promise.all([getServer(serverId), apiListChannels(serverId)])
        if (!isSameSession(token) || get().currentServer?.id !== serverId) return
        set({
          currentServer: res.server,
          currentMembers: res.members,
          roles: sortRoles(res.roles ?? []),
          channels: Array.isArray(channels) ? channels : [],
          channelsLoadedFor: serverId,
          nicknames: { ...get().nicknames, [serverId]: nicknameMap(res.members) }
        })
      } catch {
        // Sem acesso (foi expulso/banido) ou rede fora: o evento server:removed
        // cuida do primeiro caso e o próximo evento tenta de novo.
      }
    },
    fetchChannels: async (serverId: string) => {
      const token = useAuthStore.getState().accessToken
      const seq = ++channelsSeq
      try {
        const channels = await apiListChannels(serverId)
        if (!isSameSession(token) || seq !== channelsSeq) return
        set({ channels: Array.isArray(channels) ? channels : [], channelsLoadedFor: serverId })
      } catch {
        if (isSameSession(token) && seq === channelsSeq) {
          set({ channels: [], channelsLoadedFor: serverId })
        }
      }
    }
  }
}
