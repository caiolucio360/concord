import { app, ipcMain, type WebContents } from 'electron'
import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import {
  parseNativeLiveQuality,
  parseNativeLiveStart,
  type NativeLiveAvailability,
  type NativeLiveEvent
} from '../../shared/nativeLive'
import { appendLog } from '../app/appLog'
import { detectLinuxGpu } from '../screen/linuxGpu'
import { LiveProcess, type LiveChild } from './liveProcess'

// Live pelo motor nativo (docs/adr/0031): o renderer pede, o main abre o
// helper concord-live e devolve os eventos. Uma live por vez, presa à página
// que pediu: recarregar ou fechar a página para a live (sem live fantasma).

const log = (message: string): void => appendLog('native-live.log', message)

export function liveHelperPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'concord-live')
    : join(app.getAppPath(), 'resources', 'linux', 'concord-live')
}

/** Só Linux no marco 1 (no Windows o SDK não codifica na placa; ver ADR). */
export function nativeLiveAvailability(
  platform: NodeJS.Platform,
  helperExists: () => boolean,
  nvidiaOnly: () => boolean
): NativeLiveAvailability {
  if (platform !== 'linux' || !helperExists()) return { available: false, nvidia: false }
  return { available: true, nvidia: nvidiaOnly() }
}

/** Recarregar ou trocar de página (não um #/rota nem um iframe) acaba com a live. */
export function leavesPage(details: { isMainFrame: boolean; isSameDocument: boolean }): boolean {
  return details.isMainFrame && !details.isSameDocument
}

const spawnLive = (path: string): LiveChild =>
  spawn(path, [], { stdio: ['pipe', 'pipe', 'ignore'], env: process.env })

let owner: WebContents | null = null

const forward = (event: NativeLiveEvent): void => {
  if (event.event !== 'stats') log(JSON.stringify(event))
  if (owner && !owner.isDestroyed()) owner.send('native-live:event', event)
}

const live = new LiveProcess(spawnLive, forward, log)

function stopLive(): void {
  live.stop()
}

/** A página que pediu a live recarregou, navegou ou fechou: a live para. */
function bindOwner(contents: WebContents): void {
  if (owner === contents) return
  owner = contents
  contents.once('destroyed', stopLive)
  contents.on('did-start-navigation', (details) => {
    if (owner === contents && leavesPage(details)) stopLive()
  })
}

export function setupNativeLive(): void {
  ipcMain.handle('native-live:availability', () =>
    nativeLiveAvailability(
      process.platform,
      () => existsSync(liveHelperPath()),
      () => detectLinuxGpu().nvidiaOnly
    )
  )
  ipcMain.handle('native-live:start', (event, payload: unknown) => {
    const start = parseNativeLiveStart(payload)
    if (!start || live.running) return false
    bindOwner(event.sender)
    log(`iniciando (${start.quality.width}x${start.quality.height}@${start.quality.fps})`)
    return live.start(liveHelperPath(), start)
  })
  ipcMain.on('native-live:quality', (_event, payload: unknown) => {
    const quality = parseNativeLiveQuality(payload)
    if (quality) live.setQuality(quality)
  })
  ipcMain.on('native-live:stop', stopLive)
  app.on('before-quit', stopLive)
}
