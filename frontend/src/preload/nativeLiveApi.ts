import { ipcRenderer } from 'electron'
import type {
  NativeLiveAvailability,
  NativeLiveEvent,
  NativeLiveQuality,
  NativeLiveStart
} from '../shared/nativeLive'

// window.api.nativeLive: a live pelo helper concord-live (main/nativeLive, docs/adr/0031).
export const nativeLiveApi = {
  availability(): Promise<NativeLiveAvailability> {
    return ipcRenderer.invoke('native-live:availability')
  },
  start(start: NativeLiveStart): Promise<boolean> {
    return ipcRenderer.invoke('native-live:start', start)
  },
  setQuality(quality: NativeLiveQuality): void {
    ipcRenderer.send('native-live:quality', quality)
  },
  stop(): void {
    ipcRenderer.send('native-live:stop')
  },
  onEvent(cb: (event: NativeLiveEvent) => void): () => void {
    const listener = (_e: unknown, event: NativeLiveEvent): void => cb(event)
    ipcRenderer.on('native-live:event', listener)
    return () => ipcRenderer.removeListener('native-live:event', listener)
  }
}

export type NativeLiveApi = typeof nativeLiveApi
