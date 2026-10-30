// Painel de observabilidade das lives: rótulos e geometria dos gráficos. Puro.

const decimal = (value: number, digits: number): string =>
  value.toLocaleString('pt-BR', { maximumFractionDigits: digits, minimumFractionDigits: 0 })

export function durationLabel(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} s`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`
}

/** Fração (0–1) em porcentagem. */
export function pctLabel(ratio: number | null | undefined): string {
  return ratio == null ? '—' : `${Math.round(ratio * 100)}%`
}

export function numberLabel(value: number | null | undefined, digits = 1): string {
  return value == null ? '—' : decimal(value, digits)
}

const KINDS: Record<string, string> = {
  transmite: 'Transmitindo',
  assiste: 'Assistindo',
  call: 'Call'
}

export function kindLabel(kind: string): string {
  return KINDS[kind] ?? kind
}

const EVENTS: Record<string, string> = {
  inicio: 'Começou',
  fim: 'Terminou',
  degrau_caiu: 'Qualidade caiu',
  degrau_subiu: 'Qualidade voltou',
  reserva_ligada: 'Reserva ligada',
  encoder_software: 'Codificando no processador',
  decoder_software: 'Decodificando no processador',
  congelamento_longo: 'Congelamento longo',
  pausada_pelo_servidor: 'Pausada pelo servidor',
  codec_trocou: 'Codec trocou'
}

export function eventLabel(type: string): string {
  return EVENTS[type] ?? type
}

/** Teto do eixo: 1, 2, 2,5 ou 5 × 10ⁿ logo acima do maior valor. */
export function niceMax(values: (number | null)[]): number {
  const top = Math.max(0, ...values.map((v) => v ?? 0))
  if (top <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(top))
  const step = [1, 1.5, 2, 2.5, 5, 10].find((m) => m * magnitude >= top) ?? 10
  return step * magnitude
}

/** Caminho SVG da série; valor null = lacuna (o LiveKit não respondeu). */
export function chartPath(
  values: (number | null)[],
  width: number,
  height: number,
  max: number
): string {
  const step = values.length > 1 ? width / (values.length - 1) : 0
  let path = ''
  let pen = false
  values.forEach((value, i) => {
    if (value === null) {
      pen = false
      return
    }
    const x = Math.round(i * step * 10) / 10
    const y = Math.round((height - (Math.min(value, max) / max) * height) * 10) / 10
    path += `${pen ? 'L' : 'M'}${x},${y}`
    pen = true
  })
  return path
}

/** Índice do ponto mais perto de x (−1 sem pontos). */
export function nearestIndex(x: number, width: number, count: number): number {
  if (count <= 0) return -1
  if (count === 1) return 0
  const i = Math.round((x / width) * (count - 1))
  return Math.max(0, Math.min(count - 1, i))
}
