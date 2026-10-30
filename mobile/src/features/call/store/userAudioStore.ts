import { create } from 'zustand'
import { clampVolume, DEFAULT_USER_AUDIO, type UserAudio } from '../lib/userVolume'

// Volume e "silenciar" de cada pessoa, só para mim. Vale enquanto o app estiver aberto (o desktop guarda no PC;
// aqui não há armazenamento de preferências ainda).

interface UserAudioState {
  settings: Record<string, UserAudio>
  get: (userId: string) => UserAudio
  setVolume: (userId: string, volume: number) => void
  toggleMuted: (userId: string) => void
  reset: () => void
}

export const useUserAudioStore = create<UserAudioState>()((set, get) => {
  const update = (userId: string, change: Partial<UserAudio>): void =>
    set({ settings: { ...get().settings, [userId]: { ...get().get(userId), ...change } } })
  return {
    settings: {},
    get: (userId) => get().settings[userId] ?? DEFAULT_USER_AUDIO,
    setVolume: (userId, volume) => update(userId, { volume: clampVolume(volume) }),
    toggleMuted: (userId) => update(userId, { muted: !get().get(userId).muted }),
    reset: () => set({ settings: {} })
  }
})
