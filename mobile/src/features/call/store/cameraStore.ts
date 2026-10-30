import { create } from 'zustand'

/** Câmeras da chamada: quem está com a câmera ligada (eu inclusive) e se a minha está ligada. */
interface CameraState {
  cameras: string[]
  on: boolean
  setCameras: (cameras: string[]) => void
  setOn: (on: boolean) => void
  reset: () => void
}

export const useCameraStore = create<CameraState>()((set) => ({
  cameras: [],
  on: false,
  setCameras: (cameras) => set({ cameras }),
  setOn: (on) => set({ on }),
  reset: () => set({ cameras: [], on: false })
}))
