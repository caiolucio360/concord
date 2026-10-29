import { SOUNDS } from './soundNotes'
import { encodeWav, renderSamples, SAMPLE_RATE, toBase64, wavDataUri } from './synthWav'

const peak = (samples: Float32Array): number => samples.reduce((max, s) => Math.max(max, Math.abs(s)), 0)

describe('síntese dos sons', () => {
  it('a duração cobre a última nota mais a cauda', () => {
    const samples = renderSamples(SOUNDS.mute) // termina em 0,15 s
    expect(samples.length / SAMPLE_RATE).toBeCloseTo(0.18, 1)
  })

  it('nunca passa do volume combinado e termina quase em silêncio', () => {
    for (const notes of Object.values(SOUNDS)) {
      const samples = renderSamples(notes)
      expect(peak(samples)).toBeLessThanOrEqual(0.4)
      expect(Math.abs(samples[samples.length - 1])).toBeLessThan(0.001)
    }
  })

  it('há som de verdade e a nota começa no ataque, sem estalo', () => {
    const samples = renderSamples(SOUNDS.unmute)
    expect(peak(samples)).toBeGreaterThan(0.05)
    expect(Math.abs(samples[0])).toBeLessThan(0.01)
  })

  it('formas de onda e glissando geram amostras finitas', () => {
    const samples = renderSamples([
      { freq: 440, at: 0, duration: 0.05, wave: 'triangle' },
      { freq: 440, at: 0, duration: 0.05, wave: 'square' },
      { freq: 440, at: 0, duration: 0.05, wave: 'sawtooth', slide: 880 }
    ])
    expect(samples.every(Number.isFinite)).toBe(true)
  })

  it('encodeWav: cabeçalho RIFF/WAVE PCM 16 bits mono', () => {
    const wav = encodeWav(new Float32Array([0, 1, -1]))
    const text = (a: number, b: number): string => String.fromCharCode(...wav.slice(a, b))
    const view = new DataView(wav.buffer)
    expect([text(0, 4), text(8, 12), text(36, 40)]).toEqual(['RIFF', 'WAVE', 'data'])
    expect(view.getUint16(22, true)).toBe(1)
    expect(view.getUint16(34, true)).toBe(16)
    expect(view.getUint32(40, true)).toBe(6)
    expect(view.getInt16(46, true)).toBe(32767)
    expect(view.getInt16(48, true)).toBe(-32767)
  })

  it('toBase64 bate com o base64 padrão (com e sem preenchimento)', () => {
    for (const s of ['', 'a', 'ab', 'abc', 'abcd', 'Salinha!']) {
      expect(toBase64(Uint8Array.from(Buffer.from(s)))).toBe(Buffer.from(s).toString('base64'))
    }
  })

  it('wavDataUri devolve um data URI de áudio', () => {
    expect(wavDataUri(SOUNDS.join)).toMatch(/^data:audio\/wav;base64,UklGR/)
  })
})
