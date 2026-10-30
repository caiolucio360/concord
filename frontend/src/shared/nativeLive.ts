// Live pelo motor nativo (docs/adr/0031): o helper concord-live publica a tela
// direto no LiveKit. Tipos e validação dos eventos que ele manda (um JSON por
// linha no stdout); o main repassa ao renderer só o que passou por aqui.

/** Degrau da live: caixa máxima, fps e teto de bitrate (screenShareQuality.ts). */
export interface NativeLiveQuality {
  width: number
  height: number
  fps: number
  maxBitrate: number
}

export interface NativeLiveStart {
  url: string
  token: string
  quality: NativeLiveQuality
  /** Camada extra de 720p30 por baixo. */
  simulcast: boolean
  /** Som da tela (tudo menos a Salinha). */
  audio: boolean
}

export type NativeLiveErrorCode =
  | 'bad_command'
  | 'capture_denied'
  | 'connect_failed'
  | 'publish_failed'
  /** O processo não abriu ou morreu sem dizer por quê (o main inventa este). */
  | 'helper_failed'

export type NativeLiveEvent =
  | { event: 'capturing'; width: number; height: number }
  | { event: 'published'; codec: string; audio: boolean }
  | { event: 'stats'; stats: Record<string, unknown>[] }
  | { event: 'error'; code: NativeLiveErrorCode; message: string }
  | { event: 'ended'; reason: string }

/** O que o main sabe do motor nativo nesta máquina. */
export interface NativeLiveAvailability {
  /** Helper presente e plataforma suportada (Linux, por enquanto). */
  available: boolean
  /** Só placas NVIDIA: o Chromium não codifica nela no Linux (o motor nativo liga sozinho). */
  nvidia: boolean
}

type Raw = Record<string, unknown>

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)
const isString = (value: unknown): value is string => typeof value === 'string'
const isObject = (value: unknown): value is Raw =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const ERROR_CODES = new Set<string>([
  'bad_command',
  'capture_denied',
  'connect_failed',
  'publish_failed',
  'helper_failed'
])

const PARSERS: Record<string, (raw: Raw) => NativeLiveEvent | null> = {
  capturing: (raw) =>
    isNumber(raw.width) && isNumber(raw.height)
      ? { event: 'capturing', width: raw.width, height: raw.height }
      : null,
  published: (raw) =>
    isString(raw.codec) ? { event: 'published', codec: raw.codec, audio: raw.audio === true } : null,
  stats: (raw) =>
    Array.isArray(raw.stats) ? { event: 'stats', stats: raw.stats.filter(isObject) } : null,
  error: (raw) =>
    isString(raw.code) && ERROR_CODES.has(raw.code)
      ? {
          event: 'error',
          code: raw.code as NativeLiveErrorCode,
          message: isString(raw.message) ? raw.message : ''
        }
      : null,
  ended: (raw) => ({ event: 'ended', reason: isString(raw.reason) ? raw.reason : 'unknown' })
}

/** Uma linha do stdout do helper; null = não é um evento conhecido (log perdido, lixo). */
export function parseNativeLiveEvent(line: string): NativeLiveEvent | null {
  let raw: unknown
  try {
    raw = JSON.parse(line)
  } catch {
    return null
  }
  if (!isObject(raw) || !isString(raw.event)) return null
  return PARSERS[raw.event]?.(raw) ?? null
}

const MAX_FPS = 60

/** Degrau vindo do renderer (IPC): só números inteiros no intervalo que o helper aceita. */
export function parseNativeLiveQuality(value: unknown): NativeLiveQuality | null {
  if (!isObject(value)) return null
  const { width, height, fps, maxBitrate } = value
  const sides = [width, height].every((side) => Number.isInteger(side) && (side as number) >= 2)
  const rate = Number.isInteger(fps) && (fps as number) >= 1 && (fps as number) <= MAX_FPS
  const bits = Number.isInteger(maxBitrate) && (maxBitrate as number) > 0
  if (!sides || !rate || !bits) return null
  return { width, height, fps, maxBitrate } as NativeLiveQuality
}

/** Pedido de live vindo do renderer: endereço ws(s)/http(s) do servidor, token e degrau. */
export function parseNativeLiveStart(value: unknown): NativeLiveStart | null {
  if (!isObject(value) || !isString(value.url) || !isString(value.token) || !value.token) return null
  if (!/^(wss?|https?):\/\//.test(value.url)) return null
  const quality = parseNativeLiveQuality(value.quality)
  if (!quality) return null
  return {
    url: value.url,
    token: value.token,
    quality,
    simulcast: value.simulcast === true,
    audio: value.audio === true
  }
}
