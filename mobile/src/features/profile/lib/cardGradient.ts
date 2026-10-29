export interface GradientLine {
  x0: number
  y0: number
  x1: number
  y1: number
}

/**
 * A linha do degradê para um retângulo w×h, como no CSS: 180° é de cima para baixo, 90° da esquerda para
 * a direita. A linha passa pelo centro e é longa o bastante para os cantos pegarem a primeira e a última cor.
 */
export function gradientLine(angle: number, w: number, h: number): GradientLine {
  const rad = ((Number.isFinite(angle) ? angle : 180) * Math.PI) / 180
  const dx = Math.sin(rad)
  const dy = -Math.cos(rad)
  const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2
  const [cx, cy] = [w / 2, h / 2]
  return { x0: clean(cx - dx * half), y0: clean(cy - dy * half), x1: clean(cx + dx * half), y1: clean(cy + dy * half) }
}

/** Tira o ruído de ponto flutuante (-1,4e-14, -0) das contas de seno e cosseno. */
const clean = (v: number): number => Math.round(v * 1e6) / 1e6 + 0

/** Faixas de cor dura (o fundo "Arco-íris do orgulho"): cada cor ocupa 1/n do degradê, sem mistura. */
export function prideStops(stripes: string[]): { colors: string[]; positions: number[] } {
  const n = stripes.length
  return {
    colors: stripes.flatMap((c) => [c, c]),
    positions: stripes.flatMap((_, i) => [i / n, (i + 1) / n])
  }
}
