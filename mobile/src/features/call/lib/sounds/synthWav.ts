import { noteVolume, type Note, type Wave } from './soundNotes'

export const SAMPLE_RATE = 22050
const ATTACK_S = 0.01
const FLOOR = 0.0001
const TAIL_S = 0.03

/** Uma volta da onda (fase de 0 a 1) em amplitude de -1 a 1. */
function wave(kind: Wave, phase: number): number {
  switch (kind) {
    case 'triangle':
      return 1 - 4 * Math.abs(phase - 0.5)
    case 'square':
      return phase < 0.5 ? 1 : -1
    case 'sawtooth':
      return 2 * phase - 1
    default:
      return Math.sin(2 * Math.PI * phase)
  }
}

/** Ganho da nota no instante t: sobe linear no ataque e cai exponencial até o fim (sem estalo). */
function envelope(t: number, duration: number, peak: number): number {
  if (t < ATTACK_S) return peak * (t / ATTACK_S)
  const span = Math.max(duration - ATTACK_S, 1e-6)
  return peak * Math.pow(FLOOR / peak, Math.min(1, (t - ATTACK_S) / span))
}

/** Soma as notas em amostras de -1 a 1, mono, a SAMPLE_RATE. */
export function renderSamples(notes: Note[]): Float32Array {
  const end = Math.max(...notes.map((n) => n.at + n.duration)) + TAIL_S
  const out = new Float32Array(Math.ceil(end * SAMPLE_RATE))
  for (const note of notes) {
    const first = Math.floor(note.at * SAMPLE_RATE)
    const count = Math.floor(note.duration * SAMPLE_RATE)
    const peak = noteVolume(note)
    const kind = note.wave ?? 'sine'
    let phase = 0
    for (let i = 0; i < count; i++) {
      const t = i / SAMPLE_RATE
      const freq = note.slide ? note.freq * Math.pow(note.slide / note.freq, t / note.duration) : note.freq
      phase = (phase + freq / SAMPLE_RATE) % 1
      out[first + i] += wave(kind, phase) * envelope(t, note.duration, peak)
    }
  }
  return out
}

/** WAV PCM 16 bits mono (cabeçalho de 44 bytes + amostras). */
export function encodeWav(samples: Float32Array): Uint8Array {
  const bytes = new Uint8Array(44 + samples.length * 2)
  const view = new DataView(bytes.buffer)
  const text = (offset: number, s: string): void => [...s].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)))
  text(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  text(8, 'WAVEfmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, SAMPLE_RATE, true)
  view.setUint32(28, SAMPLE_RATE * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  text(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  samples.forEach((s, i) => view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, s)) * 32767), true))
  return bytes
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/** Base64 sem depender de btoa/Buffer (o Hermes nem sempre tem). */
export function toBase64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0)
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63]
    out += i + 1 < bytes.length ? B64[(n >> 6) & 63] : '='
    out += i + 2 < bytes.length ? B64[n & 63] : '='
  }
  return out
}

/** `data:` URI com o WAV pronto para o player. */
export function wavDataUri(notes: Note[]): string {
  return `data:audio/wav;base64,${toBase64(encodeWav(renderSamples(notes)))}`
}
